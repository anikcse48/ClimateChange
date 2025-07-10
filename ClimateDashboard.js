import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { getAllClimateRecords } from './database';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;

// Fixed width per column (adjust as needed)
const columnWidths = {
  id: 80,
  userId: 120,
  type: 120,
  date: 140,
  month: 140,
  min: 80,
  max: 80,
  mean: 80,
  total: 80,
  device_code: 140,
  entry_time: 140,
  study_site: 80,
};

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

    // Sort descending by entry_time (latest first)
    records.sort((a, b) => {
      if (!a.entry_time) return 1;
      if (!b.entry_time) return -1;
      return new Date(b.entry_time) - new Date(a.entry_time);
    });

    setData(records);
    setFiltered(records);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filterData = () => {
    const result = data.filter((item) => {
      return (
        (searchType ? item.type === searchType : true) &&
        (searchSite ? item.study_site === searchSite : true) &&
        (searchMonth
          ? item.month
            ? item.month.toLowerCase().includes(searchMonth.toLowerCase())
            : false
          : true)
      );
    });

    // Sort filtered data descending by entry_time (latest first)
    result.sort((a, b) => {
      if (!a.entry_time) return 1;
      if (!b.entry_time) return -1;
      return new Date(b.entry_time) - new Date(a.entry_time);
    });

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

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Climate Dashboard</Text>

      <TextInput
        placeholder="Search Month (e.g. 2025-07)"
        style={styles.input}
        value={searchMonth}
        onChangeText={setSearchMonth}
      />

      <Picker
        selectedValue={searchType}
        onValueChange={setSearchType}
        style={styles.input}
      >
        <Picker.Item label="Select Type" value="" />
        <Picker.Item label="Daily Temp" value="dailyTemp" />
        <Picker.Item label="Monthly Temp" value="monthlyTemp" />
        <Picker.Item label="Daily Humidity" value="dailyHumidity" />
        <Picker.Item label="Monthly Humidity" value="monthlyHumidity" />
        <Picker.Item label="Daily Rain" value="dailyRain" />
        <Picker.Item label="Monthly Rain" value="monthlyRain" />
      </Picker>

      <Picker
        selectedValue={searchSite}
        onValueChange={setSearchSite}
        style={styles.input}
      >
        <Picker.Item label="Select Site" value="" />
        <Picker.Item label="01. Sylhet" value="01. Sylhet" />
        <Picker.Item label="02. ZK" value="02. ZK" />
      </Picker>

      <View style={styles.iconButtonRow}>
        <TouchableOpacity onPress={filterData} style={styles.iconButton}>
          <Ionicons name="filter" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.iconButton, { backgroundColor: '#f59e0b' }]}
        >
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Horizontal Table with Sticky Header */}
      <ScrollView horizontal style={{ flex: 1 }} ref={scrollRef}>
        <View>
          {/* Table Header */}
          <View style={[styles.row, styles.headerRow]}>
            
            <Text
              style={[styles.cell, { width: columnWidths.userId }, styles.headerCell]}
            >
              User ID
            </Text>
            <Text style={[styles.cell, { width: columnWidths.type }, styles.headerCell]}>
              Type
            </Text>
            <Text
              style={[styles.cell, { width: columnWidths.date }, styles.headerCell]}
            >
              Date
            </Text>
            <Text
              style={[styles.cell, { width: columnWidths.month }, styles.headerCell]}
            >
              Month
            </Text>
            <Text style={[styles.cell, { width: columnWidths.min }, styles.headerCell]}>
              Min
            </Text>
            <Text style={[styles.cell, { width: columnWidths.max }, styles.headerCell]}>
              Max
            </Text>
            <Text
              style={[styles.cell, { width: columnWidths.mean }, styles.headerCell]}
            >
              Mean
            </Text>
            <Text
              style={[styles.cell, { width: columnWidths.total }, styles.headerCell]}
            >
              Total
            </Text>
            <Text
              style={[styles.cell, { width: columnWidths.device_code }, styles.headerCell]}
            >
              Device Code
            </Text>
            <Text
              style={[styles.cell, { width: columnWidths.entry_time }, styles.headerCell]}
            >
              Entry Date
            </Text>
            <Text
              style={[styles.cell, { width: columnWidths.study_site }, styles.headerCell]}
            >
              Study Site
            </Text>
          </View>

          {/* Table Body */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.row,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow,
                ]}
              >
              
                <Text style={[styles.cell, { width: columnWidths.userId }]}>
                  {item.userId}
                </Text>
                <Text style={[styles.cell, { width: columnWidths.type }]}>{item.type}</Text>
                <Text style={[styles.cell, { width: columnWidths.date }]}>
                  {formatDate(item.date)}
                </Text>
                <Text style={[styles.cell, { width: columnWidths.month }]}>
                  {item.month || '-'}
                </Text>
                <Text style={[styles.cell, { width: columnWidths.min }]}>
                  {item.min ?? '-'}
                </Text>
                <Text style={[styles.cell, { width: columnWidths.max }]}>
                  {item.max ?? '-'}
                </Text>
                <Text style={[styles.cell, { width: columnWidths.mean }]}>
                  {item.mean ?? '-'}
                </Text>
                <Text style={[styles.cell, { width: columnWidths.total }]}>
                  {item.total ?? '-'}
                </Text>
                <Text style={[styles.cell, { width: columnWidths.device_code }]}>
                  {item.device_code || '-'}
                </Text>
                <Text style={[styles.cell, { width: columnWidths.entry_time }]}>
                  {formatDate(item.entry_time)}
                </Text>
                <Text style={[styles.cell, { width: columnWidths.study_site }]}>
                  {item.study_site || '-'}
                </Text>
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
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ccc',
  },
  headerCell: {
    fontWeight: 'bold',
    backgroundColor: '#f8fafc',
  },
  evenRow: {
    backgroundColor: '#fff',
  },
  oddRow: {
    backgroundColor: '#f9fafb',
  },
});

export default ClimateDashboard;
