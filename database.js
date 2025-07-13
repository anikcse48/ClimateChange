// === database.js ===
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

let dbInstance = null;

export const getDatabase = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('climate.db');
    await initializeTables(dbInstance);
  }
  return dbInstance;
};

const sampleUsers = [
  ['401', 'admin', '1234', 'Roban Khan Anik', 'Sylhet'],
  ['402', 'user', '0000', 'Pampi Rani Das', 'ZK'],
  ['403', 'user1', '1111', 'Arif Hossain', 'Sylhet'],
  ['404', 'user2', '2222', 'Sadia Afrin', 'ZK'],
  ['405', 'user3', '3333', 'Riyad Hasan', 'Sylhet'],
  ['406', 'user4', '4444', 'Farzana Khatun', 'ZK'],
  ['407', 'user5', '5555', 'Kamal Uddin', 'Sylhet'],
  ['408', 'user6', '6666', 'Tanvir Islam', 'ZK'],
  ['409', 'user7', '7777', 'Nasrin Sultana', 'Sylhet'],
  ['410', 'user8', '8888', 'Ashik Rahman', 'ZK'],
];

export const initializeTables = async (db) => {
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users_ (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      fullName TEXT NOT NULL,
      region TEXT,
      is_logged_in INTEGER DEFAULT 0
    );
  `);

  for (const [id, username, password, fullName, region] of sampleUsers) {
    const existing = await db.getFirstAsync('SELECT id FROM users_ WHERE id = ?', id);
    if (!existing) {
      await db.runAsync(
        'INSERT INTO users_ (id, username, password, fullName, region) VALUES (?, ?, ?, ?, ?);',
        id, username, password, fullName, region
      );
    }
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS climate_records_ (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT,
      date TEXT,
      month TEXT,
      min REAL,
      max REAL,
      mean REAL,
      total REAL,
      device_code TEXT,
      latitude REAL,
      longitude REAL,
      is_live INTEGER NOT NULL DEFAULT 2,
      entry_time TEXT NOT NULL,
      study_site TEXT,
      FOREIGN KEY(userId) REFERENCES users_(id)
    );
  `);
};

const formatDateTime = (date) => {
  const d = new Date(date);
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatMonthToDateString = (monthStr) => {
  if (!monthStr) return null;
  const isValid = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr);
  if (!isValid) throw new Error('Invalid month format. Use YYYY-MM');
  const now = new Date();
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${monthStr}-01 ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

export const insertClimateRecord = async (record) => {
  const db = await getDatabase();
  const {
    userId,
    type,
    date,
    month,
    min,
    max,
    mean,
    total,
    device_code,
    latitude,
    longitude,
    studySite
  } = record;

  if (!userId) throw new Error('Missing userId');

  const user = await db.getFirstAsync('SELECT * FROM users_ WHERE id = ?', userId);
  if (!user) throw new Error('User not found');

  let prefix = '';
  if (user.region === 'Sylhet') prefix = '600';
  else if (user.region === 'ZK') prefix = '500';
  else throw new Error('Region missing for user');

  let id;
  do {
    const suffix = Math.floor(10000 + Math.random() * 90000);
    id = `${prefix}${userId}${suffix}`;
    const existing = await db.getFirstAsync('SELECT id FROM climate_records_ WHERE id = ?', id);
    if (!existing) break;
  } while (true);

  const entry_time = formatDateTime(new Date());

  let formattedDate = null;
  if (date) {
    const [y, m, d] = date.split('-');
    const now = new Date();
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), now.getHours(), now.getMinutes(), now.getSeconds());
    formattedDate = formatDateTime(dateObj);
  }

  const formattedMonth = month ? formatMonthToDateString(month.trim()) : null;

  await db.runAsync(
    `INSERT INTO climate_records_
     (id, userId, type, date, month, min, max, mean, total, device_code, latitude, longitude, is_live, entry_time, study_site)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?);`,
    id,
    userId,
    type,
    formattedDate,
    formattedMonth,
    min ?? null,
    max ?? null,
    mean ?? null,
    total ?? null,
    device_code || '',
    latitude ?? null,
    longitude ?? null,
    entry_time,
    studySite || ''
  );
};

export const validateUser = async (username, password) => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE users_ SET is_logged_in = 0`);
  await db.runAsync(`UPDATE users_ SET is_logged_in = 1 WHERE username = ? AND password = ?`, username, password);
  return await db.getFirstAsync('SELECT * FROM users_ WHERE username = ? AND password = ?;', username, password);
};

export const logoutUser = async () => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE users_ SET is_logged_in = 0`);
};

export const getLoggedInUser = async () => {
  const db = await getDatabase();
  return await db.getFirstAsync(`SELECT * FROM users_ WHERE is_logged_in = 1 LIMIT 1`);
};

export const updateClimateRecord = async (record) => {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE climate_records_ SET
      type = ?, date = ?, month = ?, min = ?, max = ?, mean = ?, total = ?,
      device_code = ?, latitude = ?, longitude = ?, is_live = ?, entry_time = ?, study_site = ?
     WHERE id = ?;`,
    record.type,
    record.date,
    record.month,
    record.min,
    record.max,
    record.mean,
    record.total,
    record.device_code,
    record.latitude,
    record.longitude,
    record.is_live ?? 2,
    record.entry_time ?? new Date().toISOString(),
    record.studySite ?? '',
    record.id
  );
};

export const deleteClimateRecord = async (id) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM climate_records_ WHERE id = ?', id);
};

export const getAllClimateRecords = async () => {
  const db = await getDatabase();
  return await db.getAllAsync(`SELECT * FROM climate_records_ ORDER BY entry_time DESC`);
};

export const markRecordAsBackedUp = async (id) => {
  const db = await getDatabase();
  await db.runAsync('UPDATE climate_records_ SET is_live = 1 WHERE id = ?;', id);
};

export const exportDatabaseToLocalStorage = async () => {
  const dbName = 'climate.db';
  const sourceUri = `${FileSystem.documentDirectory}SQLite/${dbName}`;

  const fileInfo = await FileSystem.getInfoAsync(sourceUri);
  if (!fileInfo.exists) {
    Alert.alert('Error', 'Database file not found!');
    return;
  }

  if (Platform.OS === 'android') {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        Alert.alert('Permission denied', 'Cannot access storage');
        return;
      }
      const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        dbName,
        'application/octet-stream'
      );

      const dbFileData = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
      await FileSystem.writeAsStringAsync(destUri, dbFileData, { encoding: FileSystem.EncodingType.Base64 });

      Alert.alert('Success', `Database saved to Downloads folder.`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  } else if (Platform.OS === 'ios') {
    const destUri = `${FileSystem.documentDirectory}${dbName}`;
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    Alert.alert('Success', 'Database saved to app documents folder.');
  } else {
    Alert.alert('Unsupported platform');
  }
};

const BACKUP_API_URL = 'http://27.147.225.171:8080/ClimateChange/Backup_API/Form_2.php';

export const backupUnsyncedData = async () => {
  try {
    const db = await getDatabase();
    const unsyncedRecords = await db.getAllAsync('SELECT * FROM climate_records_ WHERE is_live = 2');

    if (unsyncedRecords.length === 0) {
      Alert.alert('Backup', '✅ No unsynced data found.');
      return;
    }

    for (const record of unsyncedRecords) {
      const user = await db.getFirstAsync('SELECT * FROM users_ WHERE id = ?', record.userId);
      if (!user) {
        console.warn(`⚠ Skipping record ID ${record.id} due to missing user.`);
        continue;
      }

      const recordArray = [
        record.id,
        record.study_site || '',
        record.type || '',
        record.date || '',
        record.month || '',
        record.min ?? null,
        record.max ?? null,
        record.mean ?? null,
        record.total ?? null,
        record.device_code || '',
        record.latitude ?? null,
        record.longitude ?? null,
        record.entry_time || '',
        record.userId || '',
      ];

      const jsonData = JSON.stringify(recordArray);

      const response = await fetch(BACKUP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(jsonData)}`,
      });

      const resultText = await response.text();

      if (resultText.trim() !== '2') {
        await db.runAsync('UPDATE climate_records_ SET is_live = 1 WHERE id = ?', record.id);
        console.log(`✔ Synced record ID ${record.id}`);
      } else {
        console.warn(`❌ Backup rejected for record ID ${record.id}: Response = "${resultText.trim()}"`);
      }
    }

    Alert.alert('Backup Complete', '✅ All unsynced records are backed up.');
  } catch (error) {
    console.error('❌ Backup error:', error);
    Alert.alert('Error', '❌ Failed to back up data. Please check your network or API.');
  }
};
