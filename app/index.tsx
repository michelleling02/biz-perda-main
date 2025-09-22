import React from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();

  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        // --- THIS IS THE FIX ---
        // 1. Set the session to active.
        await setActive({ session: signInAttempt.createdSessionId });
        
        // 2. DO NOT redirect here. The root _layout.tsx will detect the
        //    change in `isSignedIn` status and handle the role-based redirect.
        //    This prevents the TypeScript error and race conditions.
        // --- END OF FIX ---

      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        Alert.alert('Login Error', 'Could not complete sign in.');
      }
    } catch (err: any) {
      Alert.alert('Login Error', err.errors?.[0]?.message || 'An unknown error occurred.');
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#58508D', '#FF6361']} style={styles.header}>
        <Text style={styles.headerTitle}>Welcome Back!</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <TextInput
          autoCapitalize="none"
          value={emailAddress}
          placeholder="Email Address"
          onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
          style={styles.input}
        />
        <TextInput
          value={password}
          placeholder="Password"
          secureTextEntry={true}
          onChangeText={(password) => setPassword(password)}
          style={styles.input}
        />
        <TouchableOpacity onPress={onSignInPress} style={styles.button} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>
        <View style={styles.linkContainer}>
          <Text>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: { padding: 40, alignItems: 'center' },
  headerTitle: { fontSize: 24, color: 'white', fontWeight: 'bold' },
  formContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#58508D', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  linkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  link: { color: '#58508D', fontWeight: 'bold' },
});
