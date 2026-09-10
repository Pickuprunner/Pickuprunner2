import React from 'react';
import { Platform, StyleSheet, View, StatusBar } from 'react-native';
import { colors } from '@/constants/design';
import {
  WebMap,
  NativeMap,
  MapSelectedCard,
  MapStopsCarousel,
  useMapState,
} from '@/components/map';

export default function MapScreen() {
  const {
    orders,
    activeOrders,
    pendingOrders,
    selectedOrder,
    selectedId,
    currentTab,
    effectiveDriverLocation,
    isConnected,
    atCapacity,
    queueCount,
    handleSelectId,
    handleTabChange,
    handleAcceptOrder,
    handleOpenOrder,
  } = useMapState();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.mapWrapper}>
        {Platform.OS === 'web' ? (
          <WebMap
            orders={orders}
            selectedId={selectedId}
            onSelect={handleSelectId}
            currentTab={currentTab}
            driverLocation={effectiveDriverLocation}
            activeOrders={activeOrders}
          />
        ) : (
          <NativeMap
            orders={orders}
            selectedId={selectedId}
            onSelect={handleSelectId}
            currentTab={currentTab}
            driverLocation={effectiveDriverLocation}
            activeOrders={activeOrders}
          />
        )}
      </View>
      <View style={styles.bottomSection}>
        {selectedOrder ? (
          <MapSelectedCard
            selectedOrder={selectedOrder}
            onClose={() => handleSelectId(null)}
            onAccept={handleAcceptOrder}
            onOpenOrder={handleOpenOrder}
            atCapacity={atCapacity}
          />
        ) : (
          <MapStopsCarousel
            currentTab={currentTab}
            onTabChange={handleTabChange}
            pendingOrders={pendingOrders}
            activeOrders={activeOrders}
            selectedId={selectedId}
            isConnected={isConnected}
            onSelectId={handleSelectId}
            atCapacity={atCapacity}
            queueCount={queueCount}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  mapWrapper: {
    flex: 1,
    minHeight: 240,
    position: 'relative',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'stretch',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.glassLevel2Border,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
});
