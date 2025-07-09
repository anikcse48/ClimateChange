// === database.js ===
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';

let dbInstance = null;

export const getDatabase = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('climatechange.db');
    await dbInstance.execAsync(`PRAGMA foreign_keys = ON`);
    await initializeTables(dbInstance);
    await addStudySiteColumnIfMissing(dbInstance);
    await addIsLoggedInColumnIfMissing(dbInstance);
  }
  return dbInstance;
};

const sampleUsers = [
  ['admin', '1234', 'Roban Khan Anik'],
  ['user', '0000', 'Pampi Rani Das'],
  ['user1', '1111', 'Arif Hossain'],
  ['user2', '2222', 'Sadia Afrin'],
  ['user3', '3333', 'Riyad Hasan'],
  ['user4', '4444', 'Farzana Khatun'],
  ['user5', '5555', 'Kamal Uddin'],
  ['user6', '6666', 'Tanvir Islam'],
  ['user7', '7777', 'Nasrin Sultana'],
  ['user8', '8888', 'Ashik Rahman'],
];

export const initializeTables = async (db) => {
  await db.execAsync(`PRAGMA foreign_keys = ON`);

  await db.execAsync(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    is_logged_in INTEGER DEFAULT 0
  );`);

  for (const [username, password, fullName] of sampleUsers) {
    await db.runAsync(
      'INSERT OR IGNORE INTO users (username, password, fullName) VALUES (?, ?, ?);',
      username, password, fullName
    );
  }

  await db.execAsync(`CREATE TABLE IF NOT EXISTS climate_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
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
};

const addStudySiteColumnIfMissing = async (db) => {
  const columns = await db.getAllAsync(`PRAGMA table_info(climate_records);`);
  const hasColumn = columns.some(col => col.name === 'study_site');
  if (!hasColumn) {
    await db.execAsync(`ALTER TABLE climate_records ADD COLUMN study_site TEXT;`);
  }
};

const addIsLoggedInColumnIfMissing = async (db) => {
  const columns = await db.getAllAsync(`PRAGMA table_info(users);`);
  const hasColumn = columns.some(col => col.name === 'is_logged_in');
  if (!hasColumn) {
    await db.execAsync(`ALTER TABLE users ADD COLUMN is_logged_in INTEGER DEFAULT 0;`);
  }
};

export const validateUser = async (username, password) => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE users SET is_logged_in = 0`);
  await db.runAsync(`UPDATE users SET is_logged_in = 1 WHERE username = ? AND password = ?`, username, password);
  const result = await db.getFirstAsync(
    'SELECT * FROM users WHERE username = ? AND password = ?;',
    username,
    password
  );
  return result;
};

export const logoutUser = async () => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE users SET is_logged_in = 0`);
};

export const getLoggedInUser = async () => {
  const db = await getDatabase();
  const user = await db.getFirstAsync(`SELECT * FROM users WHERE is_logged_in = 1 LIMIT 1`);
  return user;
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

  if (!userId) {
    throw new Error('Cannot insert climate record: userId is missing.');
  }

  const entry_time = new Date().toISOString();
  const formattedDate = date ? new Date(date).toISOString() : null;

  await db.runAsync(
    `INSERT INTO climate_records
      (userId, type, date, month, min, max, mean, total, device_code, latitude, longitude, is_live, entry_time, study_site)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?)`,
    userId,
    type,
    formattedDate,
    month?.trim() || null,
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

export const deleteClimateRecord = async (id) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM climate_records WHERE id = ?', id);
};

export const updateClimateRecord = async (record) => {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE climate_records SET
      type = ?, date = ?, month = ?, min = ?, max = ?, mean = ?, total = ?,
      device_code = ?, latitude = ?, longitude = ?, is_live = ?, entry_time = ?, study_site = ?
     WHERE id = ?`,
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

export const getAllClimateRecords = async () => {
  const db = await getDatabase();
  const results = await db.getAllAsync(`SELECT * FROM climate_records ORDER BY entry_time DESC`);
  return results;
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
