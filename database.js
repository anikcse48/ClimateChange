// === database.js ===
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

let dbInstance = null;

export const getDatabase = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('climatechange.db');
    await initializeTables(dbInstance);
  }
  return dbInstance;
};

// Updated sample users with fixed IDs from 401 to 410
const sampleUsers = [
  ['401', 'admin', '1234', 'Roban Khan Anik'],
  ['402', 'user', '0000', 'Pampi Rani Das'],
  ['403', 'user1', '1111', 'Arif Hossain'],
  ['404', 'user2', '2222', 'Sadia Afrin'],
  ['405', 'user3', '3333', 'Riyad Hasan'],
  ['406', 'user4', '4444', 'Farzana Khatun'],
  ['407', 'user5', '5555', 'Kamal Uddin'],
  ['408', 'user6', '6666', 'Tanvir Islam'],
  ['409', 'user7', '7777', 'Nasrin Sultana'],
  ['410', 'user8', '8888', 'Ashik Rahman'],
];

export const initializeTables = async (db) => {
  // Disable foreign keys temporarily for migration
  await db.execAsync(`PRAGMA foreign_keys = OFF;`);

  // Create new_users table with string id
  await db.execAsync(`CREATE TABLE IF NOT EXISTS new_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    is_logged_in INTEGER DEFAULT 0
  );`);

  // Migrate data from old users if exists
  const oldUsersExist = await db.getFirstAsync(`SELECT name FROM sqlite_master WHERE type='table' AND name='users';`);
  if (oldUsersExist) {
    const oldUsers = await db.getAllAsync(`SELECT * FROM users;`);
    for (const user of oldUsers) {
      await db.runAsync(
        `INSERT OR IGNORE INTO new_users (id, username, password, fullName, is_logged_in) VALUES (?, ?, ?, ?, ?);`,
        user.id ? user.id.toString() : uuidv4(),
        user.username,
        user.password,
        user.fullName,
        user.is_logged_in ?? 0
      );
    }
    await db.execAsync(`DROP TABLE users;`);
  }
  await db.execAsync(`ALTER TABLE new_users RENAME TO users;`);

  // Create new_climate_records table without group_id
  await db.execAsync(`CREATE TABLE IF NOT EXISTS new_climate_records (
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
    FOREIGN KEY(userId) REFERENCES users(id)
  );`);

  // Migrate old climate_records if exists
  const oldClimateExist = await db.getFirstAsync(`SELECT name FROM sqlite_master WHERE type='table' AND name='climate_records';`);
  if (oldClimateExist) {
    const oldRecords = await db.getAllAsync(`SELECT * FROM climate_records;`);
    for (const rec of oldRecords) {
      await db.runAsync(
        `INSERT OR IGNORE INTO new_climate_records
        (id, userId, type, date, month, min, max, mean, total, device_code, latitude, longitude, is_live, entry_time, study_site)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        rec.id ? rec.id.toString() : uuidv4(),
        rec.userId,
        rec.type,
        rec.date,
        rec.month,
        rec.min,
        rec.max,
        rec.mean,
        rec.total,
        rec.device_code,
        rec.latitude,
        rec.longitude,
        rec.is_live,
        rec.entry_time,
        rec.study_site
      );
    }
    await db.execAsync(`DROP TABLE climate_records;`);
  }
  await db.execAsync(`ALTER TABLE new_climate_records RENAME TO climate_records;`);

  // Enable foreign keys back
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  // Insert sample users with fixed IDs if missing
  for (const [id, username, password, fullName] of sampleUsers) {
    const existing = await db.getFirstAsync('SELECT * FROM users WHERE username = ?', username);
    if (!existing) {
      await db.runAsync(
        'INSERT INTO users (id, username, password, fullName) VALUES (?, ?, ?, ?);',
        id, username, password, fullName
      );
    }
  }
};

// Date formatting helpers
const formatDateTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) throw new Error('Invalid date value provided.');
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

// Insert climate record with UUID id
export const insertClimateRecord = async (record) => {
  const db = await getDatabase();
  const {
    id = uuidv4(),
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

  if (!userId) throw new Error('Cannot insert climate record: userId is missing.');

  const entry_time = formatDateTime(new Date());

  let formattedDate = null;
  if (date) {
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const now = new Date();
      const [year, month, day] = date.split('-');
      d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), now.getHours(), now.getMinutes(), now.getSeconds());
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) throw new Error('Invalid date value provided.');
    formattedDate = formatDateTime(d);
  }

  const formattedMonth = month ? formatMonthToDateString(month.trim()) : null;

  await db.runAsync(
    `INSERT INTO climate_records
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

// User validation
export const validateUser = async (username, password) => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE users SET is_logged_in = 0`);
  await db.runAsync(`UPDATE users SET is_logged_in = 1 WHERE username = ? AND password = ?`, username, password);
  const result = await db.getFirstAsync('SELECT * FROM users WHERE username = ? AND password = ?;', username, password);
  return result;
};

export const logoutUser = async () => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE users SET is_logged_in = 0`);
};

export const getLoggedInUser = async () => {
  const db = await getDatabase();
  return await db.getFirstAsync(`SELECT * FROM users WHERE is_logged_in = 1 LIMIT 1`);
};

export const updateClimateRecord = async (record) => {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE climate_records SET
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

export const markRecordAsBackedUp = async (id) => {
  const db = await getDatabase();
  await db.runAsync('UPDATE climate_records SET is_live = 1 WHERE id = ?;', id);
};

export const deleteClimateRecord = async (id) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM climate_records WHERE id = ?', id);
};

export const getAllClimateRecords = async () => {
  const db = await getDatabase();
  return await db.getAllAsync(`SELECT * FROM climate_records ORDER BY entry_time DESC`);
};

export const exportDatabaseToLocalStorage = async () => {
  const dbName = 'climatechange.db';
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

// Backup API endpoint
const BACKUP_API_URL = 'http://27.147.225.171:8080/ClimateChange/Backup_API/Form_2.php';

export const backupUnsyncedData = async () => {
  try {
    const db = await getDatabase();

    const unsyncedRecords = await db.getAllAsync('SELECT * FROM climate_records WHERE is_live = 2');

    if (unsyncedRecords.length === 0) {
      Alert.alert('Backup', '✅ No unsynced data found.');
      return;
    }

    for (const record of unsyncedRecords) {
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
        await db.runAsync('UPDATE climate_records SET is_live = 1 WHERE id = ?', record.id);
        console.log(`✔ Synced record ID ${record.id}`);
      } else {
        console.warn(`❌ Backup rejected for record ID ${record.id}`);
      }
    }

    Alert.alert('Backup Complete', '✅ All unsynced records are backed up.');
  } catch (error) {
    console.error('Backup error:', error);
    Alert.alert('Error', '❌ Failed to back up data.');
  }
};
