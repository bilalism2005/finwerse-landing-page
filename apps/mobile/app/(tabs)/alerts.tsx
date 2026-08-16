import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert as RNAlert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlertsStore, Alert } from '../../src/store/alertsStore';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function AlertsScreen() {
  const { alerts, fetchAlerts, createAlert, deleteAlert, isLoading } = useAlertsStore();
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [alertType, setAlertType] = useState<'universe_wide'|'specific_stock'|'portfolio_only'>('portfolio_only');
  const [stockSymbol, setStockSymbol] = useState('');
  const [scoreType, setScoreType] = useState<'overall'|'technical'|'safety'|'sentiment'>('overall');
  const [timeframe, setTimeframe] = useState<'short'|'medium'|'long'>('short');
  const [direction, setDirection] = useState<'above'|'below'>('below');
  const [threshold, setThreshold] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreate = async () => {
    if (!threshold || isNaN(Number(threshold))) {
      RNAlert.alert("Invalid Threshold", "Please enter a valid number.");
      return;
    }
    if (alertType === 'specific_stock' && !stockSymbol.trim()) {
      RNAlert.alert("Missing Symbol", "Please enter a stock symbol.");
      return;
    }

    try {
      await createAlert({
        alert_type: alertType,
        stock_symbol: alertType === 'specific_stock' ? stockSymbol.toUpperCase() : undefined,
        score_type: scoreType,
        timeframe,
        direction,
        threshold_value: Number(threshold)
      });
      setShowForm(false);
      setThreshold('');
      setStockSymbol('');
    } catch (e) {
      RNAlert.alert("Error", "Could not create alert.");
    }
  };

  // Group alerts (Miller's Law)
  const triggeredAlerts = alerts.filter(a => a.status === 'triggered');
  const activeAlerts = alerts.filter(a => a.status === 'active');

  const groupedActive = activeAlerts.reduce((acc, curr) => {
    const key = curr.alert_type === 'specific_stock' ? curr.stock_symbol! : (curr.alert_type === 'portfolio_only' ? 'My Portfolio' : 'Universe-wide');
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {} as Record<string, Alert[]>);

  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>New Alert</Text>
      
      <Text style={styles.label}>Scope</Text>
      <View style={styles.rowGroup}>
        {(['portfolio_only', 'specific_stock', 'universe_wide'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.choiceBtn, alertType === t && styles.choiceActive]} onPress={() => setAlertType(t)}>
            <Text style={[styles.choiceText, alertType === t && styles.choiceTextActive]}>
              {t.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {alertType === 'specific_stock' && (
        <TextInput 
          style={styles.input} 
          placeholder="Stock Symbol (e.g. RELIANCE)" 
          value={stockSymbol}
          onChangeText={setStockSymbol}
          autoCapitalize="characters"
        />
      )}

      <Text style={styles.label}>Score & Timeframe</Text>
      <View style={styles.rowGroup}>
        {(['overall', 'technical', 'safety'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.choiceBtn, scoreType === t && styles.choiceActive]} onPress={() => setScoreType(t)}>
            <Text style={[styles.choiceText, scoreType === t && styles.choiceTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.rowGroup, { marginTop: 8 }]}>
        {(['short', 'medium', 'long'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.choiceBtn, timeframe === t && styles.choiceActive]} onPress={() => setTimeframe(t)}>
            <Text style={[styles.choiceText, timeframe === t && styles.choiceTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Condition</Text>
      <View style={styles.rowGroup}>
        {(['above', 'below'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.choiceBtn, direction === t && styles.choiceActive]} onPress={() => setDirection(t)}>
            <Text style={[styles.choiceText, direction === t && styles.choiceTextActive]}>Drops {t}</Text>
          </TouchableOpacity>
        ))}
        <TextInput 
          style={[styles.input, { flex: 1, marginLeft: 8, marginTop: 0 }]} 
          placeholder="Value" 
          keyboardType="numeric"
          value={threshold}
          onChangeText={setThreshold}
        />
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
          <Text style={styles.saveText}>Set Alert</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        {!showForm && (
          <TouchableOpacity onPress={() => setShowForm(true)}>
            <IconSymbol name="plus.circle.fill" size={28} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {showForm && renderForm()}

        {/* Peak-End Rule: Highlight triggered alerts at the top */}
        {triggeredAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Triggered</Text>
            {triggeredAlerts.map(alert => (
              <View key={alert.id} style={[styles.alertCard, styles.triggeredCard]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.triggeredTitle}>🚨 Fired on {alert.triggered_date}</Text>
                  <TouchableOpacity onPress={() => deleteAlert(alert.id)}>
                    <IconSymbol name="xmark.circle.fill" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.alertDesc}>
                  {alert.triggered_symbol} crossed {alert.direction} {alert.threshold_value} on {alert.timeframe} {alert.score_type}.
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Miller's Law: Group active alerts by target */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          {Object.keys(groupedActive).length === 0 ? (
            <Text style={styles.emptyText}>No active alerts.</Text>
          ) : (
            Object.entries(groupedActive).map(([groupKey, groupAlerts]) => (
              <View key={groupKey} style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{groupKey}</Text>
                {groupAlerts.map(alert => (
                  <View key={alert.id} style={styles.alertCard}>
                    <Text style={styles.alertDesc}>
                      {alert.timeframe} {alert.score_type} is {alert.direction} {alert.threshold_value}
                    </Text>
                    <TouchableOpacity onPress={() => deleteAlert(alert.id)}>
                      <IconSymbol name="trash" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  formCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 24 },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginTop: 12, marginBottom: 8, fontWeight: '600' },
  rowGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: 'transparent' },
  choiceActive: { backgroundColor: '#E5F1FF', borderColor: '#007AFF' },
  choiceText: { color: '#333', fontSize: 14 },
  choiceTextActive: { color: '#007AFF', fontWeight: 'bold' },
  input: { backgroundColor: '#F2F2F7', borderRadius: 8, padding: 12, marginTop: 8, fontSize: 16 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  cancelBtn: { padding: 12 },
  cancelText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
  saveBtn: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  emptyText: { color: '#8E8E93', fontStyle: 'italic' },
  groupContainer: { marginBottom: 16 },
  groupTitle: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 8 },
  alertCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8 },
  triggeredCard: { backgroundColor: '#FFF9E6', borderColor: '#FFCC00', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  triggeredTitle: { fontWeight: 'bold', color: '#D48806', fontSize: 14 },
  alertDesc: { fontSize: 15, color: '#333', flex: 1 },
});
