import React, { useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Line, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Order } from '@/lib/orders';
import { CENTER, getCoords, haptic, CYAN, GOLD } from './mapTypes';
import { TargetIcon } from '@/assets/icons/MapIcons';

export function WebMap({
  orders,
  selectedId,
  onSelect,
}: {
  orders: Order[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const selectedOrder = orders.find((o) => o.id === selectedId);

  const width = 400;
  const height = 320;
  const storeX = 200;
  const storeY = 160;

  const getCanvasCoords = useCallback((order: Order) => {
    const c = getCoords(order);
    const x = storeX + (c.lng - CENTER.lng) * 4500;
    const y = storeY - (c.lat - CENTER.lat) * 4500;
    const boundedX = Math.max(30, Math.min(width - 30, x));
    const boundedY = Math.max(40, Math.min(height - 40, y));
    return { x: boundedX, y: boundedY };
  }, []);

  const selectedCoords = selectedOrder ? getCanvasCoords(selectedOrder) : null;

  return (
    <View style={styles.webMapContainer}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0B1324" />
            <Stop offset="50%" stopColor="#0E192D" />
            <Stop offset="100%" stopColor="#070C16" />
          </LinearGradient>
          <LinearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00B2FF" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#E5A93C" stopOpacity="0.9" />
          </LinearGradient>
        </Defs>

        <Rect width={width} height={height} fill="url(#mapBg)" />

        <G opacity={0.15} stroke="#38BDF8" strokeWidth={1}>
          <Line x1={0} y1={80} x2={width} y2={80} strokeDasharray="6,6" />
          <Line x1={0} y1={160} x2={width} y2={160} />
          <Line x1={0} y1={240} x2={width} y2={240} strokeDasharray="6,6" />
          <Line x1={100} y1={0} x2={100} y2={height} strokeDasharray="4,4" />
          <Line x1={200} y1={0} x2={200} y2={height} />
          <Line x1={300} y1={0} x2={300} y2={height} strokeDasharray="4,4" />
        </G>

        <Path
          d="M -20,280 Q 120,200 220,120 T 420,-10"
          fill="none"
          stroke="#0284C7"
          strokeWidth={14}
          opacity={0.25}
        />
        <Path
          d="M -20,280 Q 120,200 220,120 T 420,-10"
          fill="none"
          stroke="#38BDF8"
          strokeWidth={3}
          opacity={0.4}
        />

        <Path
          d="M 50,-10 L 140,160 L 160,330"
          fill="none"
          stroke="#475569"
          strokeWidth={6}
          opacity={0.5}
        />
        <Path
          d="M 50,-10 L 140,160 L 160,330"
          fill="none"
          stroke="#CBD5E1"
          strokeWidth={2}
          opacity={0.6}
          strokeDasharray="8,8"
        />

        {selectedCoords && (
          <G>
            <Line
              x1={storeX}
              y1={storeY}
              x2={selectedCoords.x}
              y2={selectedCoords.y}
              stroke="url(#routeGrad)"
              strokeWidth={4}
              strokeDasharray="6,4"
              strokeLinecap="round"
            />
            <Circle
              cx={selectedCoords.x}
              cy={selectedCoords.y}
              r={24}
              fill="none"
              stroke="#00B2FF"
              strokeWidth={2}
              opacity={0.5}
            />
          </G>
        )}

        <G transform={`translate(${storeX}, ${storeY})`}>
          <Circle r={18} fill="rgba(0, 178, 255, 0.18)" />
          <Circle r={10} fill="#00B2FF" />
          <Circle r={4} fill="#FFFFFF" />
        </G>

        {orders.map((order) => {
          if (order.status === 'delivered') return null;
          const pt = getCanvasCoords(order);
          const isSelected = order.id === selectedId;
          const isActive = order.status === 'accepted' || order.status === 'picked_up';
          const pinColor = isActive ? CYAN : GOLD;

          return (
            <G
              key={order.id}
              transform={`translate(${pt.x}, ${pt.y})`}
              onPress={() => {
                haptic('light');
                onSelect(order.id);
              }}
              style={{ cursor: 'pointer' } as any}
            >
              <Circle
                r={isSelected ? 18 : 14}
                fill={pinColor}
                opacity={isSelected ? 0.35 : 0.2}
              />
              <Path
                d="M 0 -16 C -8 -16 -12 -10 -12 -2 C -12 6 0 16 0 16 C 0 16 12 6 12 -2 C 12 -10 8 -16 0 -16 Z"
                fill={pinColor}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <Circle cx={0} cy={-4} r={4} fill="#000000" opacity={0.7} />
              <Circle cx={0} cy={-4} r={2.5} fill="#FFFFFF" />
            </G>
          );
        })}
      </Svg>

      {selectedOrder && (
        <View style={styles.inMapCallout}>
          <Text style={styles.calloutName} numberOfLines={1}>
            {selectedOrder.customerName}
          </Text>
          <Text style={styles.calloutAddress} numberOfLines={2}>
            {selectedOrder.deliveryAddress}
          </Text>
          <View style={styles.calloutArrow} />
        </View>
      )}

      <Pressable
        onPress={() => {
          haptic('light');
          onSelect(null);
        }}
        style={({ pressed }) => [styles.mapControlButton, pressed && { opacity: 0.7 }]}
      >
        <TargetIcon size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  webMapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#0B1324',
  },
  inMapCallout: {
    position: 'absolute',
    top: '35%',
    left: '25%',
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 25,
  },
  calloutName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  calloutAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  calloutArrow: {
    position: 'absolute',
    bottom: -6,
    left: '45%',
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  mapControlButton: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(20, 24, 38, 0.9)',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});
