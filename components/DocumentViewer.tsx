import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  XCircle,
  ZoomIn,
  Car,
  FileText,
  Image as ImageIcon,
} from '@blinkdotnew/mobile-ui';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius } from '@/constants/design';

// ── Document Thumbnail ──────────────────────────────────────────────────────

export function DocThumbnail({
  label,
  url,
  filename,
  icon,
  onPress,
}: {
  label: string;
  url?: string;
  filename?: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!url) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.thumbContainer, pressed && { opacity: 0.8 }]}
    >
      <YStack gap="$1">
        <YStack
          width={140}
          height={100}
          borderRadius={borderRadius.md}
          overflow="hidden"
          backgroundColor="$color3"
          borderWidth={1}
          borderColor="$color5"
        >
          {!error ? (
            <>
              <Image
                source={{ uri: url }}
                style={styles.thumbImage}
                contentFit="cover"
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
              />
              {!loaded && (
                <YStack
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  alignItems="center"
                  justifyContent="center"
                >
                  <ActivityIndicator size="small" color={colors.textTertiary} />
                </YStack>
              )}
              <YStack
                position="absolute"
                bottom={4}
                right={4}
                backgroundColor="rgba(0,0,0,0.6)"
                borderRadius={6}
                paddingHorizontal={6}
                paddingVertical={2}
              >
                <ZoomIn size={12} color="white" />
              </YStack>
            </>
          ) : (
            <YStack flex={1} alignItems="center" justifyContent="center" gap="$1">
              {icon}
              <SizableText size="$1" color="$color9">Tap to open</SizableText>
            </YStack>
          )}
        </YStack>

        <XStack gap="$1" alignItems="center" maxWidth={140}>
          {icon}
          <SizableText size="$1" fontWeight="600" color="$color11" numberOfLines={1} flex={1}>
            {label}
          </SizableText>
        </XStack>
      </YStack>
    </Pressable>
  );
}


interface DocItem {
  label: string;
  url: string;
  filename?: string;
}

export function DocumentLightbox({
  visible,
  documents,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  documents: DocItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      setLoading(true);
    }
  }, [visible, initialIndex]);

  const doc = documents[activeIndex];
  if (!doc) return null;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isWeb = Platform.OS === 'web';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <XStack
          position="absolute"
          top={isWeb ? 20 : 50}
          right={16}
          zIndex={10}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <XCircle size={28} color="white" />
          </Pressable>
        </XStack>

        <XStack
          position="absolute"
          top={isWeb ? 20 : 50}
          left={16}
          zIndex={10}
          backgroundColor="rgba(0,0,0,0.7)"
          borderRadius={borderRadius.md}
          paddingHorizontal={12}
          paddingVertical={6}
          gap="$2"
          alignItems="center"
        >
          {doc.label.includes('License') || doc.label.includes('license') ? (
            <Car size={14} color="white" />
          ) : (
            <FileText size={14} color="white" />
          )}
          <SizableText size="$3" fontWeight="700" color="white">
            {doc.label}
          </SizableText>
          {documents.length > 1 && (
            <SizableText size="$2" color="rgba(255,255,255,0.6)">
              {activeIndex + 1}/{documents.length}
            </SizableText>
          )}
        </XStack>

        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.imageContainer}
        >
          <ScrollView
            maximumZoomScale={3}
            minimumZoomScale={1}
            contentContainerStyle={styles.zoomContainer}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {loading && (
              <YStack
                position="absolute"
                top="50%"
                left="50%"
                style={{ transform: [{ translateX: -12 }, { translateY: -12 }] }}
              >
                <ActivityIndicator size="large" color="white" />
              </YStack>
            )}
            <Image
              source={{ uri: doc.url }}
              style={{
                width: screenWidth * 0.92,
                height: screenHeight * 0.75,
              }}
              contentFit="contain"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          </ScrollView>
        </Pressable>

        {documents.length > 1 && (
          <XStack
            position="absolute"
            bottom={isWeb ? 30 : 50}
            left={0}
            right={0}
            justifyContent="center"
            gap="$3"
          >
            {documents.map((d, i) => (
              <Pressable
                key={i}
                onPress={(e) => {
                  e.stopPropagation();
                  setActiveIndex(i);
                  setLoading(true);
                }}
                style={({ pressed }) => [
                  styles.navDot,
                  i === activeIndex && styles.navDotActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <SizableText
                  size="$1"
                  fontWeight="700"
                  color={i === activeIndex ? 'white' : 'rgba(255,255,255,0.5)'}
                >
                  {d.label.split(' ')[0]}
                </SizableText>
              </Pressable>
            ))}
          </XStack>
        )}

        {doc.filename && (
          <XStack
            position="absolute"
            bottom={isWeb ? 70 : 90}
            left={0}
            right={0}
            justifyContent="center"
          >
            <SizableText size="$1" color="rgba(255,255,255,0.4)">
              {doc.filename}
            </SizableText>
          </XStack>
        )}
      </Pressable>
    </Modal>
  );
}


export function DocumentPreviewRow({
  licenseUrl,
  licenseFilename,
  insuranceUrl,
  insuranceFilename,
}: {
  licenseUrl?: string;
  licenseFilename?: string;
  insuranceUrl?: string;
  insuranceFilename?: string;
}) {
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const docs: DocItem[] = [];
  if (licenseUrl) docs.push({ label: "Driver's License", url: licenseUrl, filename: licenseFilename });
  if (insuranceUrl) docs.push({ label: 'Insurance', url: insuranceUrl, filename: insuranceFilename });

  if (docs.length === 0) return null;

  const openDoc = (index: number) => {
    setActiveIdx(index);
    setLightboxVisible(true);
  };

  return (
    <>
      <XStack gap="$3" flexWrap="wrap">
        {licenseUrl && (
          <DocThumbnail
            label="Driver's License"
            url={licenseUrl}
            filename={licenseFilename}
            icon={<Car size={12} color="$blue9" />}
            onPress={() => openDoc(0)}
          />
        )}
        {insuranceUrl && (
          <DocThumbnail
            label="Insurance"
            url={insuranceUrl}
            filename={insuranceFilename}
            icon={<FileText size={12} color="$blue9" />}
            onPress={() => openDoc(docs.length > 1 ? 1 : 0)}
          />
        )}
      </XStack>

      <DocumentLightbox
        visible={lightboxVisible}
        documents={docs}
        initialIndex={activeIdx}
        onClose={() => setLightboxVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  thumbContainer: {
    cursor: 'pointer',
  },
  thumbImage: {
    width: 140,
    height: 100,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    padding: 4,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  zoomContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  navDot: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  navDotActive: {
    backgroundColor: 'rgba(0,102,255,0.6)',
    borderColor: 'rgba(0,102,255,0.8)',
  },
});
