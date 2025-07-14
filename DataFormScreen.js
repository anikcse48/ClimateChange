import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Alert,
  View,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { TextInput, Button, Card, Text, Menu, Avatar } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import * as Location from 'expo-location';
import { insertClimateRecord, getLoggedInUser } from './database';
import { useNavigation } from '@react-navigation/native';

// Helpers
const pad = (n) => (n < 10 ? '0' + n : n);

const formatDateTime = (dateObj) => {
  if (!dateObj) return null;

  const date = new Date(dateObj);
  if (isNaN(date.getTime())) return null;

  // If time is midnight (picked from DatePicker), inject current time
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
    const now = new Date();
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
  }

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export default function DataFormScreen() {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const navigation = useNavigation();

  const [studySite, setStudySite] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dailyTemp, setDailyTemp] = useState({
    date: new Date(),
    min: '',
    max: '',
    mean: '',
    deviceCode: '',
  });
  const [monthlyTemp, setMonthlyTemp] = useState({
    month: null, // Changed to Date object or null
    min: '',
    max: '',
    mean: '',
    deviceCode: '',
  });
  const [dailyHumidity, setDailyHumidity] = useState({
    date: new Date(),
    min: '',
    max: '',
    mean: '',
    deviceCode: '',
  });
  const [monthlyHumidity, setMonthlyHumidity] = useState({
    month: null, // Changed to Date object or null
    min: '',
    max: '',
    mean: '',
    deviceCode: '',
  });
  const [dailyRain, setDailyRain] = useState({ date: new Date(), total: '', deviceCode: '' });
  const [monthlyRain, setMonthlyRain] = useState({
    month: null, // Changed to Date object or null
    total: '',
    deviceCode: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getLoggedInUser();
      if (user) {
        setUserId(user.id);
        setUserName(user.fullName);
        navigation.setOptions({
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
              <Menu
                visible={profileMenuVisible}
                onDismiss={() => setProfileMenuVisible(false)}
                anchor={
                  <Avatar.Text
                    size={36}
                    label={user.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                    style={{ backgroundColor: '#0ea5e9', marginLeft: 8 }}
                    onPress={() => setProfileMenuVisible(true)}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    setProfileMenuVisible(false);
                    navigation.navigate('Profile');
                  }}
                  title="Profile"
                />
                <Menu.Item
                  onPress={() => {
                    setProfileMenuVisible(false);
                    navigation.navigate('Settings');
                  }}
                  title="Settings"
                />
                <Menu.Item
                  onPress={() => {
                    setProfileMenuVisible(false);
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                  }}
                  title="Logout"
                />
              </Menu>
              <Text style={{ marginLeft: 8, fontWeight: 'bold', color: '#0f172a' }}>
                {user.fullName}
              </Text>
            </View>
          ),
        });
      }
    };
    fetchUser();
  }, [profileMenuVisible, navigation]);

  const handleSave = async () => {
    if (saving) return; // prevent double call

    setSaving(true);
    try {
      // === VALIDATIONS ===

      // Daily Temperature Validation
      if (!dailyTemp.deviceCode || !dailyTemp.min || !dailyTemp.max || !dailyTemp.mean) {
        Alert.alert('Missing Fields', 'Please fill all Daily Temperature fields.');
        setSaving(false);
        return;
      }

      // Daily Humidity Validation
      if (!dailyHumidity.deviceCode || !dailyHumidity.min || !dailyHumidity.max || !dailyHumidity.mean) {
        Alert.alert('Missing Fields', 'Please fill all Daily Humidity fields.');
        setSaving(false);
        return;
      }

      // Daily Rainfall Validation
      if (!dailyRain.deviceCode || !dailyRain.total) {
        Alert.alert('Missing Fields', 'Please fill all Daily Rainfall fields.');
        setSaving(false);
        return;
      }

      // === Permissions ===
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        setSaving(false);
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;

      // === Data Insert ===
      const inserts = [];

      // Daily Temperature
      inserts.push(
        insertClimateRecord({
          userId,
          type: 'dailyTemp',
          date: formatDateTime(dailyTemp.date),
          min: parseFloat(dailyTemp.min),
          max: parseFloat(dailyTemp.max),
          mean: parseFloat(dailyTemp.mean),
          device_code: dailyTemp.deviceCode,
          latitude,
          longitude,
          studySite,
        })
      );

      // Daily Humidity
      inserts.push(
        insertClimateRecord({
          userId,
          type: 'dailyHumidity',
          date: formatDateTime(dailyHumidity.date),
          min: parseFloat(dailyHumidity.min),
          max: parseFloat(dailyHumidity.max),
          mean: parseFloat(dailyHumidity.mean),
          device_code: dailyHumidity.deviceCode,
          latitude,
          longitude,
          studySite,
        })
      );

      // Daily Rainfall
      inserts.push(
        insertClimateRecord({
          userId,
          type: 'dailyRain',
          date: formatDateTime(dailyRain.date),
          total: parseFloat(dailyRain.total),
          device_code: dailyRain.deviceCode,
          latitude,
          longitude,
          studySite,
        })
      );

      // Monthly Temperature (Optional)
      if (
        monthlyTemp.month &&
        (monthlyTemp.min || monthlyTemp.max || monthlyTemp.mean)
      ) {
        inserts.push(
          insertClimateRecord({
            userId,
            type: 'monthlyTemp',
            month: formatDateTime(monthlyTemp.month),
            date: formatDateTime(monthlyTemp.month),
            min: parseFloat(monthlyTemp.min) || null,
            max: parseFloat(monthlyTemp.max) || null,
            mean: parseFloat(monthlyTemp.mean) || null,
            device_code: monthlyTemp.deviceCode,
            latitude,
            longitude,
            studySite,
          })
        );
      }

      // Monthly Humidity (Optional)
      if (
        monthlyHumidity.month &&
        (monthlyHumidity.min || monthlyHumidity.max || monthlyHumidity.mean)
      ) {
        inserts.push(
          insertClimateRecord({
            userId,
            type: 'monthlyHumidity',
            month: formatDateTime(monthlyHumidity.month),
            date: formatDateTime(monthlyHumidity.month),
            min: parseFloat(monthlyHumidity.min) || null,
            max: parseFloat(monthlyHumidity.max) || null,
            mean: parseFloat(monthlyHumidity.mean) || null,
            device_code: monthlyHumidity.deviceCode,
            latitude,
            longitude,
            studySite,
          })
        );
      }

      // Monthly Rainfall (Optional)
      if (monthlyRain.month && monthlyRain.total) {
        inserts.push(
          insertClimateRecord({
            userId,
            type: 'monthlyRain',
            month: formatDateTime(monthlyRain.month),
            date: formatDateTime(monthlyRain.month),
            total: parseFloat(monthlyRain.total) || null,
            device_code: monthlyRain.deviceCode,
            latitude,
            longitude,
            studySite,
          })
        );
      }

      await Promise.all(inserts);
      Alert.alert('✅ Success', 'Climate data saved locally.');

      // Reset Form
      setStudySite('');
      setDailyTemp({ date: new Date(), min: '', max: '', mean: '', deviceCode: '' });
      setMonthlyTemp({ month: null, min: '', max: '', mean: '', deviceCode: '' });
      setDailyHumidity({ date: new Date(), min: '', max: '', mean: '', deviceCode: '' });
      setMonthlyHumidity({ month: null, min: '', max: '', mean: '', deviceCode: '' });
      setDailyRain({ date: new Date(), total: '', deviceCode: '' });
      setMonthlyRain({ month: null, total: '', deviceCode: '' });
    } catch (err) {
      Alert.alert('❌ Error', err.message);
    } finally {
      setSaving(false); // allow future submissions
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text style={styles.heading}>
              ফর্ম ২: জলবায়ুর পরিমাপক এবং বায়ু দূষণকারী উপাদানের ফর্ম
            </Text>
            <Text style={styles.subheading}>ফর্ম ২.১: জলবায়ুর পরিমাপক রেকর্ড ফর্ম </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="গবেষণার স্থান " />
          <Card.Content>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TextInput
                  label="গবেষণার স্থান"
                  mode="outlined"
                  value={studySite}
                  onFocus={() => setMenuVisible(true)}
                  right={<TextInput.Icon icon="menu-down" />}
                />
              }
            >
              <Menu.Item onPress={() => { setStudySite('01'); setMenuVisible(false); }} title="সিলেট শহর " />
              <Menu.Item onPress={() => { setStudySite('02'); setMenuVisible(false); }} title="জকিগঞ্জ" />
            </Menu>
          </Card.Content>
        </Card>

        {/* Daily Temperature */}
        <Card style={styles.card}>
          <Card.Title title="দৈনিক তাপমাত্রার রেকর্ড " />
          <Card.Content>
            <TextInput
              label="ডিভাইস কোড * "
              mode="outlined"
              value={dailyTemp.deviceCode}
              onChangeText={(text) => setDailyTemp({ ...dailyTemp, deviceCode: text })}
            />
            <DatePickerInput
              locale="en"
              label="তারিখ"
              value={dailyTemp.date}
              onChange={(date) => setDailyTemp({ ...dailyTemp, date })}
              inputMode="start"
              mode="outlined"
            />
            <TextInput
              label="সর্বনিম্ন তাপমাত্রা  (°C)*"
              mode="outlined"
              keyboardType="numeric"
              value={dailyTemp.min}
              onChangeText={(text) => setDailyTemp({ ...dailyTemp, min: text })}
            />
            <TextInput
              label="সর্বোচ্চ তাপমাত্রা (°C)*"
              mode="outlined"
              keyboardType="numeric"
              value={dailyTemp.max}
              onChangeText={(text) => setDailyTemp({ ...dailyTemp, max: text })}
            />
            <TextInput
              label="গড় তাপমাত্রা  (°C)*"
              mode="outlined"
              keyboardType="numeric"
              value={dailyTemp.mean}
              onChangeText={(text) => setDailyTemp({ ...dailyTemp, mean: text })}
            />
          </Card.Content>
        </Card>

        {/* Monthly Temperature */}
        <Card style={styles.card}>
          <Card.Title title="মাসিক তাপমাত্রার রেকর্ড " />
          <Card.Content>
            <TextInput
              label="ডিভাইস কোড "
              mode="outlined"
              value={monthlyTemp.deviceCode}
              onChangeText={(text) => setMonthlyTemp({ ...monthlyTemp, deviceCode: text })}
            />
            <DatePickerInput
              locale="en"
              label="মাস"
              value={monthlyTemp.month}
              onChange={(date) => setMonthlyTemp({ ...monthlyTemp, month: date })}
              mode="outlined"
              inputMode="start"
            />
            <TextInput
              label="সর্বনিম্ন তাপমাত্রা  (°C)"
              mode="outlined"
              keyboardType="numeric"
              value={monthlyTemp.min}
              onChangeText={(text) => setMonthlyTemp({ ...monthlyTemp, min: text })}
            />
            <TextInput
              label="সর্বোচ্চ তাপমাত্রা (°C)"
              mode="outlined"
              keyboardType="numeric"
              value={monthlyTemp.max}
              onChangeText={(text) => setMonthlyTemp({ ...monthlyTemp, max: text })}
            />
            <TextInput
              label="গড় তাপমাত্রা  (°C)"
              mode="outlined"
              keyboardType="numeric"
              value={monthlyTemp.mean}
              onChangeText={(text) => setMonthlyTemp({ ...monthlyTemp, mean: text })}
            />
          </Card.Content>
        </Card>

        {/* Daily Humidity */}
        <Card style={styles.card}>
          <Card.Title title="দৈনিক আদ্রতার রেকর্ড " />
          <Card.Content>
            <TextInput
              label="ডিভাইস কোড *"
              mode="outlined"
              value={dailyHumidity.deviceCode}
              onChangeText={(text) => setDailyHumidity({ ...dailyHumidity, deviceCode: text })}
            />
            <DatePickerInput
              locale="en"
              label="তারিখ"
              value={dailyHumidity.date}
              onChange={(date) => setDailyHumidity({ ...dailyHumidity, date })}
              inputMode="start"
              mode="outlined"
            />
            <TextInput
              label="সর্বনিম্ন আদ্রতা *"
              mode="outlined"
              keyboardType="numeric"
              value={dailyHumidity.min}
              onChangeText={(text) => setDailyHumidity({ ...dailyHumidity, min: text })}
            />
            <TextInput
              label="সর্বোচ্চ আদ্রতা *"
              mode="outlined"
              keyboardType="numeric"
              value={dailyHumidity.max}
              onChangeText={(text) => setDailyHumidity({ ...dailyHumidity, max: text })}
            />
            <TextInput
              label="গড় আদ্রতা * "
              mode="outlined"
              keyboardType="numeric"
              value={dailyHumidity.mean}
              onChangeText={(text) => setDailyHumidity({ ...dailyHumidity, mean: text })}
            />
          </Card.Content>
        </Card>

        {/* Monthly Humidity */}
        <Card style={styles.card}>
          <Card.Title title="মাসিক আদ্রতার রেকর্ড " />
          <Card.Content>
            <TextInput
              label="ডিভাইস কোড "
              mode="outlined"
              value={monthlyHumidity.deviceCode}
              onChangeText={(text) => setMonthlyHumidity({ ...monthlyHumidity, deviceCode: text })}
            />
            <DatePickerInput
              locale="en"
              label="মাস"
              value={monthlyHumidity.month}
              onChange={(date) => setMonthlyHumidity({ ...monthlyHumidity, month: date })}
              mode="outlined"
              inputMode="start"
            />
            <TextInput
              label="সর্বনিম্ন আদ্রতা "
              mode="outlined"
              keyboardType="numeric"
              value={monthlyHumidity.min}
              onChangeText={(text) => setMonthlyHumidity({ ...monthlyHumidity, min: text })}
            />
            <TextInput
              label="সর্বোচ্চ আদ্রতা "
              mode="outlined"
              keyboardType="numeric"
              value={monthlyHumidity.max}
              onChangeText={(text) => setMonthlyHumidity({ ...monthlyHumidity, max: text })}
            />
            <TextInput
              label="গড় আদ্রতা "
              mode="outlined"
              keyboardType="numeric"
              value={monthlyHumidity.mean}
              onChangeText={(text) => setMonthlyHumidity({ ...monthlyHumidity, mean: text })}
            />
          </Card.Content>
        </Card>

        {/* Daily Rainfall */}
        <Card style={styles.card}>
          <Card.Title title="দৈনিক বৃষ্টিপাতের রেকর্ড " />
          <Card.Content>
            <TextInput
              label="ডিভাইস কোড *"
              mode="outlined"
              value={dailyRain.deviceCode}
              onChangeText={(text) => setDailyRain({ ...dailyRain, deviceCode: text })}
            />
            <DatePickerInput
              locale="en"
              label="তারিখ"
              value={dailyRain.date}
              onChange={(date) => setDailyRain({ ...dailyRain, date })}
              inputMode="start"
              mode="outlined"
            />
            <TextInput
              label="মোট বৃষ্টিপাত (মিমি)*"
              mode="outlined"
              keyboardType="numeric"
              value={dailyRain.total}
              onChangeText={(text) => setDailyRain({ ...dailyRain, total: text })}
            />
          </Card.Content>
        </Card>

        {/* Monthly Rainfall */}
        <Card style={styles.card}>
          <Card.Title title="মাসিক বৃষ্টিপাতের রেকর্ড " />
          <Card.Content>
            <TextInput
              label="ডিভাইস কোড "
              mode="outlined"
              value={monthlyRain.deviceCode}
              onChangeText={(text) => setMonthlyRain({ ...monthlyRain, deviceCode: text })}
            />
            <DatePickerInput
              locale="en"
              label="মাস"
              value={monthlyRain.month}
              onChange={(date) => setMonthlyRain({ ...monthlyRain, month: date })}
              mode="outlined"
              inputMode="start"
            />
            <TextInput
              label="মোট বৃষ্টিপাত (মিমি)"
              mode="outlined"
              keyboardType="numeric"
              value={monthlyRain.total}
              onChangeText={(text) => setMonthlyRain({ ...monthlyRain, total: text })}
            />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleSave}
          style={{ margin: 12 }}
          loading={saving}
          disabled={saving}
        >
          সংরক্ষণ করুন
        </Button>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 60,
  },
  card: {
    margin: 12,
  },
  headerCard: {
    marginBottom: 12,
    marginHorizontal: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#0ea5e9',
  },
  subheading: {
    fontWeight: '600',
    fontSize: 14,
    color: '#0f172a',
    marginTop: 6,
  },
});
