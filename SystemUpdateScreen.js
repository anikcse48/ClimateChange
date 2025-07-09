import React, { useEffect, useState } from 'react';
import { View, Text,ActivityIndicator, StyleSheet, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { Button } from 'react-native-paper';

export default function SystemUpdateScreen() {
  const [checking, setChecking] = useState(false);

  const checkForUpdate = async () => {
    try {
      setChecking(true);
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert('Update Available', 'Downloading update...', [{ text: 'OK' }]);
        await Updates.fetchUpdateAsync();
        Alert.alert('Update Ready', 'Restarting app...', [{ text: 'OK', onPress: () => Updates.reloadAsync() }]);
      } else {
        Alert.alert('Up to Date', 'Your app is already updated.');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      
      <Button
  icon="cloud-download"       // or "update" or "sync"
  mode="contained"
  onPress={checkForUpdate}
  disabled={checking}
>
  Check for Update
</Button>
      {checking && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 16 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, marginBottom: 20 }
});
