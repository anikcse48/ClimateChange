import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { validateUser } from './database';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
  try {
    const user = await validateUser(username, password);
    if (user) {
      onLoginSuccess(user);
    } else {
      alert('Invalid username or password');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('An error occurred during login');
  }
};

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/logop.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>CLIMATE CHANGE</Text>

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#94a3b8"
      />

      <TouchableOpacity onPress={handleLogin} style={styles.button}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <Text style={styles.footer1}>v1.00</Text>

      <Text style={styles.footer}>© 2025 CLIMATE CHANGE. All rights reserved.</Text>
    </View>
  );
}

// Use same styles as before
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1e293b',
  },
  input: {
    width: '100%',
    maxWidth: 400,
    padding: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },

  footer: {
    marginTop: 40,
    color: '#64748b',
    fontSize: 12,
  },
  footer1: {
    marginTop: 20,
    color: '#64748b',
    fontSize: 12,
  },
});
