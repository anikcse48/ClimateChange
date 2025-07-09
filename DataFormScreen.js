import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, View } from 'react-native';
import { TextInput, Button, Card, Text, Menu, Avatar } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import * as Location from 'expo-location';
import { insertClimateRecord, getLoggedInUser } from './database';
import { useNavigation } from '@react-navigation/native';

// Helpers
const pad = (n) => (n < 10 ? '0' + n : n);

const formatDateTime = (dateObj) => {
  const d = new Date(dateObj);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function DataFormScreen() {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const navigation = useNavigation();

  const [studySite, setStudySite] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  const [dailyTemp, setDailyTemp] = useState({ date: new Date(), min: '', max: '', mean: '', deviceCode: '' });
  const [monthlyTemp, setMonthlyTemp] = useState({ month: '', min: '', max: '', mean: '', deviceCode: '' });
  const [dailyHumidity, setDailyHumidity] = useState({ date: new Date(), min: '', max: '', mean: '', deviceCode: '' });
  const [monthlyHumidity, setMonthlyHumidity] = useState({ month: '', min: '', max: '', mean: '', deviceCode: '' });
  const [dailyRain, setDailyRain] = useState({ date: new Date(), total: '', deviceCode: '' });
  const [monthlyRain, setMonthlyRain] = useState({ month: '', total: '', deviceCode: '' });

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
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Avatar.Text
                    size={36}
                    label={user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    style={{ backgroundColor: '#0ea5e9', marginLeft: 8 }}
                    onPress={() => setMenuVisible(true)}
                  />
                }>
                <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }} title="Profile" />
                <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Settings'); }} title="Settings" />
                <Menu.Item onPress={() => {
                  setMenuVisible(false);
                  navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                }} title="Logout" />
              </Menu>
              <Text style={{ marginLeft: 8, fontWeight: 'bold', color: '#0f172a' }}>{user.fullName}</Text>
            </View>
          ),
        });
      }
    };
    fetchUser();
  }, [menuVisible, navigation]);

  const handleSave = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;

      const inserts = [];

      if (dailyTemp.min || dailyTemp.max || dailyTemp.mean) {
        inserts.push(insertClimateRecord({
          userId, type: 'dailyTemp', date: formatDateTime(dailyTemp.date),
          min: parseFloat(dailyTemp.min) || null, max: parseFloat(dailyTemp.max) || null,
          mean: parseFloat(dailyTemp.mean) || null, device_code: dailyTemp.deviceCode,
          latitude, longitude, studySite,
        }));
      }

      if (monthlyTemp.month && (monthlyTemp.min || monthlyTemp.max || monthlyTemp.mean)) {
        inserts.push(insertClimateRecord({
          userId, type: 'monthlyTemp', month: monthlyTemp.month.trim(),
          min: parseFloat(monthlyTemp.min) || null, max: parseFloat(monthlyTemp.max) || null,
          mean: parseFloat(monthlyTemp.mean) || null, device_code: monthlyTemp.deviceCode,
          latitude, longitude, studySite,
        }));
      }

      if (dailyHumidity.min || dailyHumidity.max || dailyHumidity.mean) {
        inserts.push(insertClimateRecord({
          userId, type: 'dailyHumidity', date: formatDateTime(dailyHumidity.date),
          min: parseFloat(dailyHumidity.min) || null, max: parseFloat(dailyHumidity.max) || null,
          mean: parseFloat(dailyHumidity.mean) || null, device_code: dailyHumidity.deviceCode,
          latitude, longitude, studySite,
        }));
      }

      if (monthlyHumidity.month && (monthlyHumidity.min || monthlyHumidity.max || monthlyHumidity.mean)) {
        inserts.push(insertClimateRecord({
          userId, type: 'monthlyHumidity', month: monthlyHumidity.month.trim(),
          min: parseFloat(monthlyHumidity.min) || null, max: parseFloat(monthlyHumidity.max) || null,
          mean: parseFloat(monthlyHumidity.mean) || null, device_code: monthlyHumidity.deviceCode,
          latitude, longitude, studySite,
        }));
      }

      if (dailyRain.total) {
        inserts.push(insertClimateRecord({
          userId, type: 'dailyRain', date: formatDateTime(dailyRain.date),
          total: parseFloat(dailyRain.total) || null, device_code: dailyRain.deviceCode,
          latitude, longitude, studySite,
        }));
      }

      if (monthlyRain.month && monthlyRain.total) {
        inserts.push(insertClimateRecord({
          userId, type: 'monthlyRain', month: monthlyRain.month.trim(),
          total: parseFloat(monthlyRain.total) || null, device_code: monthlyRain.deviceCode,
          latitude, longitude, studySite,
        }));
      }

      await Promise.all(inserts);
      Alert.alert('Success', 'Climate data saved locally.');

      // Reset form
      setStudySite('');
      setDailyTemp({ date: new Date(), min: '', max: '', mean: '', deviceCode: '' });
      setMonthlyTemp({ month: '', min: '', max: '', mean: '', deviceCode: '' });
      setDailyHumidity({ date: new Date(), min: '', max: '', mean: '', deviceCode: '' });
      setMonthlyHumidity({ month: '', min: '', max: '', mean: '', deviceCode: '' });
      setDailyRain({ date: new Date(), total: '', deviceCode: '' });
      setMonthlyRain({ month: '', total: '', deviceCode: '' });

    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

     <Card style={styles.headerCard}>
  <Card.Content>
    <Text style={styles.heading}>Study Tools (English)</Text>
    <Text style={styles.subheading}>
      Form 2.1 Climate Parameters Record Form (Daily till 6 months)
    </Text>
  </Card.Content>
</Card>

      <Card style={styles.card}>
  <Card.Title title="Study Site" />
  <Card.Content>
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <TextInput
          label="Select Study Site"
          mode="outlined"
          value={studySite}
          onFocus={() => setMenuVisible(true)}
          right={<TextInput.Icon icon="menu-down" />}
        />
      }>
      <Menu.Item onPress={() => { setStudySite('01. Sylhet'); setMenuVisible(false); }} title="01. Sylhet" />
      <Menu.Item onPress={() => { setStudySite('02. ZK'); setMenuVisible(false); }} title="02. ZK" />
    </Menu>
  </Card.Content>
</Card>


      {/* === Daily Temperature === */}
      <Card style={styles.card}>
        <Card.Title title="Daily Temperature Record" />
        <Card.Content>
          <TextInput
            label="Device Code"
            mode="outlined"
            value={dailyTemp.deviceCode}
            onChangeText={(text) => setDailyTemp({ ...dailyTemp, deviceCode: text })}
          />
          <DatePickerInput
            locale="en"
            label="Date"
            value={dailyTemp.date}
            onChange={(date) => setDailyTemp({ ...dailyTemp, date })}
            inputMode="start"
            mode="outlined"
          />
          <TextInput label="Minimum Temp (°C)" mode="outlined" keyboardType="numeric" value={dailyTemp.min} onChangeText={(text) => setDailyTemp({ ...dailyTemp, min: text })} />
          <TextInput label="Maximum Temp (°C)" mode="outlined" keyboardType="numeric" value={dailyTemp.max} onChangeText={(text) => setDailyTemp({ ...dailyTemp, max: text })} />
          <TextInput label="Mean Temp (°C)" mode="outlined" keyboardType="numeric" value={dailyTemp.mean} onChangeText={(text) => setDailyTemp({ ...dailyTemp, mean: text })} />
        </Card.Content>
      </Card>

      {/* === Monthly Temperature === */}
      <Card style={styles.card}>
        <Card.Title title="Monthly Temperature Record" />
        <Card.Content>
          <TextInput label="Device Code" mode="outlined" value={monthlyTemp.deviceCode} onChangeText={(text) => setMonthlyTemp({ ...monthlyTemp, deviceCode: text })} />
          <TextInput label="Month (e.g. July 2025)" mode="outlined" value={monthlyTemp.month} onChangeText={(text) => setMonthlyTemp({ ...monthlyTemp, month: text })} />
          <TextInput label="Minimum Temp (°C)" mode="outlined" keyboardType="numeric" value={monthlyTemp.min} onChangeText={(text) => setMonthlyTemp({ ...monthlyTemp, min: text })} />
          <TextInput label="Maximum Temp (°C)" mode="outlined" keyboardType="numeric" value={monthlyTemp.max} onChangeText={(text) => setMonthlyTemp({ ...monthlyTemp, max: text })} />
          <TextInput label="Mean Temp (°C)" mode="outlined" keyboardType="numeric" value={monthlyTemp.mean} onChangeText={(text) => setMonthlyTemp({ ...monthlyTemp, mean: text })} />
        </Card.Content>
      </Card>

      {/* === Daily Humidity === */}
      <Card style={styles.card}>
        <Card.Title title="Daily Humidity Record" />
        <Card.Content>
          <TextInput label="Device Code" mode="outlined" value={dailyHumidity.deviceCode} onChangeText={(text) => setDailyHumidity({ ...dailyHumidity, deviceCode: text })} />
          <DatePickerInput
            locale="en"
            label="Date"
            value={dailyHumidity.date}
            onChange={(date) => setDailyHumidity({ ...dailyHumidity, date })}
            inputMode="start"
            mode="outlined"
          />
          <TextInput label="Minimum Humidity (%)" mode="outlined" keyboardType="numeric" value={dailyHumidity.min} onChangeText={(text) => setDailyHumidity({ ...dailyHumidity, min: text })} />
          <TextInput label="Maximum Humidity (%)" mode="outlined" keyboardType="numeric" value={dailyHumidity.max} onChangeText={(text) => setDailyHumidity({ ...dailyHumidity, max: text })} />
          <TextInput label="Mean Humidity (%)" mode="outlined" keyboardType="numeric" value={dailyHumidity.mean} onChangeText={(text) => setDailyHumidity({ ...dailyHumidity, mean: text })} />
        </Card.Content>
      </Card>

      {/* === Monthly Humidity === */}
      <Card style={styles.card}>
        <Card.Title title="Monthly Humidity Record" />
        <Card.Content>
          <TextInput label="Device Code" mode="outlined" value={monthlyHumidity.deviceCode} onChangeText={(text) => setMonthlyHumidity({ ...monthlyHumidity, deviceCode: text })} />
          <TextInput label="Month (e.g. July 2025)" mode="outlined" value={monthlyHumidity.month} onChangeText={(text) => setMonthlyHumidity({ ...monthlyHumidity, month: text })} />
          <TextInput label="Minimum Humidity (%)" mode="outlined" keyboardType="numeric" value={monthlyHumidity.min} onChangeText={(text) => setMonthlyHumidity({ ...monthlyHumidity, min: text })} />
          <TextInput label="Maximum Humidity (%)" mode="outlined" keyboardType="numeric" value={monthlyHumidity.max} onChangeText={(text) => setMonthlyHumidity({ ...monthlyHumidity, max: text })} />
          <TextInput label="Mean Humidity (%)" mode="outlined" keyboardType="numeric" value={monthlyHumidity.mean} onChangeText={(text) => setMonthlyHumidity({ ...monthlyHumidity, mean: text })} />
        </Card.Content>
      </Card>

      {/* === Daily Rainfall === */}
      <Card style={styles.card}>
        <Card.Title title="Daily Rainfall Record" />
        <Card.Content>
          <TextInput label="Device Code" mode="outlined" value={dailyRain.deviceCode} onChangeText={(text) => setDailyRain({ ...dailyRain, deviceCode: text })} />
          <DatePickerInput
            locale="en"
            label="Date"
            value={dailyRain.date}
            onChange={(date) => setDailyRain({ ...dailyRain, date })}
            inputMode="start"
            mode="outlined"
          />
          <TextInput label="Total Rainfall (mm)" mode="outlined" keyboardType="numeric" value={dailyRain.total} onChangeText={(text) => setDailyRain({ ...dailyRain, total: text })} />
        </Card.Content>
      </Card>

      {/* === Monthly Rainfall === */}
      <Card style={styles.card}>
        <Card.Title title="Monthly Rainfall Record" />
        <Card.Content>
          <TextInput label="Device Code" mode="outlined" value={monthlyRain.deviceCode} onChangeText={(text) => setMonthlyRain({ ...monthlyRain, deviceCode: text })} />
          <TextInput label="Month (e.g. July 2025)" mode="outlined" value={monthlyRain.month} onChangeText={(text) => setMonthlyRain({ ...monthlyRain, month: text })} />
          <TextInput label="Total Rainfall (mm)" mode="outlined" keyboardType="numeric" value={monthlyRain.total} onChangeText={(text) => setMonthlyRain({ ...monthlyRain, total: text })} />
        </Card.Content>
      </Card>

      {/* Save Button */}
      <Button
  mode="contained"
  icon="content-save"  // or any other icon name from MaterialCommunityIcons
  onPress={handleSave}
  style={styles.button}
>
  Save Record
</Button>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f1f5f9',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    elevation: 3,
  },
  button: {
    marginVertical: 24,
    backgroundColor: "#541e7c",
    paddingVertical: 8,
  },
  headerCard: {
  marginBottom: 20,
  backgroundColor: '#e0f2fe',
  borderRadius: 12,
  padding: 16,
  elevation: 4,
},
heading: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#0f172a',
  marginBottom: 4,
},
subheading: {
  fontSize: 16,
  color: '#334155',
}
});
