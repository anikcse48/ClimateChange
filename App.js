import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, Button, StyleSheet, Alert} from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

import ClimateDashboard from './ClimateDashboard';
import LoginScreen from './LoginScreen';
import DataFormScreen from './DataFormScreen';
import { exportDatabaseToLocalStorage, backupUnsyncedData } from './database'; 
import SystemUpdateScreen from './SystemUpdateScreen';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
 




 
function BackupScreen({ navigation }) {
  React.useEffect(() => {
    const runBackup = async () => {
      await backupUnsyncedData();
      navigation.goBack(); // Optional: go back after backup
    };
    runBackup();
  }, []);

  return (
    <View style={styles.center}>
      <Text>Backing up data...</Text>
    </View>
  );
}


function ImportScreen() {
  return (
    <View style={styles.center}>
      <Text>Import Screen</Text>
    </View>
  );
}



// HomeTabs receives userName as a prop to display in headerRight
function HomeTabs({ userName }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true, // Show header to customize
        headerRight: () => (
          <Text
            style={{
              marginRight: 15,
              fontWeight: 'bold',
              color: '#0f172a',
              fontSize: 16,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {userName}
          </Text>
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName =
            route.name === 'DataForm'
              ? focused
                ? 'document-text'
                : 'document-text-outline'
              : focused
              ? 'cloud-upload'
              : 'cloud-upload-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="DataForm" component={DataFormScreen} />
      <Tab.Screen name="Backup" component={BackupScreen} />
    </Tab.Navigator>
  );
}

function MainApp({ onLogout, loggedInUser }) {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        drawerIcon: ({ size, color }) => {
          const icons = {
            Home: 'home',
            Dashboard: 'view-dashboard',
            Import: 'database-import',
            Export: 'database-export',
            Logout: 'logout',
           'System Update': 'update',
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name] || 'circle'}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      {/* Pass loggedInUser.fullName as userName prop */}
      <Drawer.Screen name="Home">
        {() => <HomeTabs userName={loggedInUser?.fullName || ''} />}
      </Drawer.Screen>
      <Drawer.Screen name="Dashboard" component={ClimateDashboard} />
      <Drawer.Screen name="Import" component={ImportScreen} />
      <Drawer.Screen
  name="Export"
  component={({ navigation }) => {
    exportDatabaseToLocalStorage().finally(() => {
      navigation.goBack(); // Optional: return to the previous screen
    });
    return null; // Show no screen
  }}
/>
<Drawer.Screen name="System Update" component={SystemUpdateScreen} />

     <Drawer.Screen
  name="Logout"
  component={({ navigation }) => {
    React.useEffect(() => {
      Alert.alert(
        'Confirm Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack(), // Simply go back if cancelled
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => {
              navigation.closeDrawer();  // Close the drawer
              onLogout();                // Perform logout
            },
          },
        ],
        { cancelable: true }
      );
    }, []);

    return null; // Don't show any UI
  }}
/>
    </Drawer.Navigator>
  );
}

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleLoginSuccess = (user) => {
    setLoggedInUser(user);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
  };

  return (
    <PaperProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          {!loggedInUser ? (
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          ) : (
            <MainApp onLogout={handleLogout} loggedInUser={loggedInUser} />
          )}
        </NavigationContainer>
      </GestureHandlerRootView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
