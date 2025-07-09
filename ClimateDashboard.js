import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  FlatList, RefreshControl, Dimensions
} from 'react-native';
import { getAllClimateRecords } from './database';
import { Picker } from '@react-native-picker/picker';

import Ionicons from 'react-native-vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;

const ClimateDashboard = () => {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchType, setSearchType] = useState('');
  const [searchSite, setSearchSite] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
  let records = await getAllClimateRecords();
  // Sort descending by id (latest first)
  records.sort((a, b) => b.id - a.id);
  setData(records);
  setFiltered(records);
};

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filterData = () => {
  const result = data.filter(item => {
    return (
      (searchType ? item.type === searchType : true) &&
      (searchSite ? item.study_site === searchSite : true) &&
      (searchMonth ? (item.month ? item.month.toLowerCase().includes(searchMonth.toLowerCase()) : false) : true)
    );
  });
  // Sort filtered data descending by id
  result.sort((a, b) => b.id - a.id);
  setFiltered(result);
};

  

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return dateStr.split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const headers = ['ID', 'User ID', 'Type', 'Date', 'Month', 'Min', 'Max', 'Mean', 'Total', 'Device Code', 'Latitude', 'Longitude', 'Entry Time', 'Study Site'];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Climate Dashboard</Text>

      <TextInput
        placeholder="Search Month (e.g. July 2025)"
        style={styles.input}
        value={searchMonth}
        onChangeText={setSearchMonth}
      />

      <Picker selectedValue={searchType} onValueChange={setSearchType} style={styles.input}>
        <Picker.Item label="Select Type" value="" />
        <Picker.Item label="Daily Temp" value="dailyTemp" />
        <Picker.Item label="Monthly Temp" value="monthlyTemp" />
        <Picker.Item label="Daily Humidity" value="dailyHumidity" />
        <Picker.Item label="Monthly Humidity" value="monthlyHumidity" />
        <Picker.Item label="Daily Rain" value="dailyRain" />
        <Picker.Item label="Monthly Rain" value="monthlyRain" />
      </Picker>

      <Picker selectedValue={searchSite} onValueChange={setSearchSite} style={styles.input}>
        <Picker.Item label="Select Site" value="" />
        <Picker.Item label="01. Sylhet" value="01. Sylhet" />
        <Picker.Item label="02. ZK" value="02. ZK" />
      </Picker>

      <View style={styles.iconButtonRow}>
        <TouchableOpacity onPress={filterData} style={styles.iconButton}>
          <Ionicons name="filter" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onRefresh} style={[styles.iconButton, { backgroundColor: '#f59e0b' }]}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Horizontal Table with Sticky Header */}
      <ScrollView
        horizontal
        style={{ flex: 1 }}
        ref={scrollRef}
      >
        <View>
          {/* Sticky Table Header */}
          <View style={[styles.row, styles.headerRow]}>
            {headers.map((header) => (
              <Text key={header} style={[styles.cell, styles.headerCell]}>
                {header}
              </Text>
            ))}
          </View>

          {/* Table Body */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.cell}>{item.id}</Text>
                <Text style={styles.cell}>{item.userId}</Text>
                <Text style={styles.cell}>{item.type}</Text>
                <Text style={styles.cell}>{formatDate(item.date)}</Text>
                <Text style={styles.cell}>{item.month || '-'}</Text>
                <Text style={styles.cell}>{item.min ?? '-'}</Text>
                <Text style={styles.cell}>{item.max ?? '-'}</Text>
                <Text style={styles.cell}>{item.mean ?? '-'}</Text>
                <Text style={styles.cell}>{item.total ?? '-'}</Text>
                <Text style={styles.cell}>{item.device_code || '-'}</Text>
                <Text style={styles.cell}>{item.latitude ?? '-'}</Text>
                <Text style={styles.cell}>{item.longitude ?? '-'}</Text>
                <Text style={styles.cell}>{formatDate(item.entry_time)}</Text>
                <Text style={styles.cell}>{item.study_site || '-'}</Text>
              </View>
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  iconButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  iconButton: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 6,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#ccc',
    minHeight: 40,
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 120,
    fontSize: 12,
    textAlign: 'left',
    borderRightWidth: 1,
    borderColor: '#ccc',
  },
  headerCell: {
    fontWeight: 'bold',
    backgroundColor: '#f8fafc',
  },
});

export default ClimateDashboard;
