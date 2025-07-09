import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { exportDatabaseToLocalStorage } from './database'; // adjust path accordingly

export default function ExportScreen() {
  return (
    <View style={styles.container}>
      <Button
        title="Export Database to Local Storage"
        onPress={exportDatabaseToLocalStorage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', padding: 20,
  },
});
