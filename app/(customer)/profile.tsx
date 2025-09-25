            <StatCard icon={MapPin} title="Visited" value={stats?.total_visited ?? 0} color="#3B82F6" />
            <StatCard icon={Star} title="Reviews" value={stats?.total_reviews ?? 0} color="#F59E0B" />
            <StatCard icon={Heart} title="Favorites" value={stats?.total_favorites ?? 0} color="#E53E3E" />
            <MenuItem icon={Bell} title="Notifications" subtitle="Manage notification preferences" rightContent={<Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: '#d1d5db', true: '#3B82F6' }} />} />
import { StatusBar } from 'expo-status-bar';
            <MenuItem icon={MapPin} title="Location Services" subtitle="Allow location access for better experience" rightContent={<Switch value={locationEnabled} onValueChange={setLocationEnabled} trackColor={{ false: '#d1d5db', true: '#3B82F6' }} />} />
  return (
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" backgroundColor="#E53E3E" />
    </>
  );
}
  container: { flex: 1, backgroundColor: '#FFFFFF' }, 
  header: { paddingHorizontal: 24, paddingVertical: 28 }, 
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 }, 
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }, 
  avatarImage: { width: '100%', height: '100%' }, 
  profileInfo: { flex: 1 }, 
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 }, 
  profileEmail: { fontSize: 15, color: 'rgba(255,255,255,0.9)', marginBottom: 6 }, 
  joinDate: { fontSize: 13, color: 'rgba(255,255,255,0.8)' }, 
  settingsButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12 }, 
  content: { flex: 1 }, 
  statsContainer: { padding: 24 }, 
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 20 }, 
  statsGrid: { flexDirection: 'row', gap: 16 }, 
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 }, 
  statCardGradient: { alignItems: 'center', padding: 20 }, 
  statValue: { fontSize: 26, fontWeight: 'bold', color: '#1F2937', marginTop: 12, marginBottom: 6 }, 
  statTitle: { fontSize: 13, color: '#6B7280', fontWeight: '600' }, 
  section: { paddingHorizontal: 24, marginBottom: 28 }, 
  menuContainer: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 }, 
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }, 
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }, 
  menuItemText: { flex: 1 }, 
  menuItemTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 }, 
  menuItemSubtitle: { fontSize: 14, color: '#6B7280' }, 
  appInfo: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 28 }, 
  appVersion: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 }, 
  appDescription: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }, 
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', marginHorizontal: 24, paddingVertical: 18, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: '#FECACA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 }, 
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' }, 
  bottomSpacing: { height: 24 },