import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CURATED_PLACES } from "../places";
import { PlaceInput } from "../types";
import { colors } from "../theme";

interface LocationPickerModalProps {
  visible: boolean;
  title: string;
  onSelect: (place: PlaceInput) => void;
  onClose: () => void;
}

export function LocationPickerModal({ visible, title, onSelect, onClose }: LocationPickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <FlatList
            data={CURATED_PLACES}
            keyExtractor={(item) => item.label}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => onSelect(item)}>
                <Text style={styles.rowText}>{item.label}</Text>
              </Pressable>
            )}
          />
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "75%" },
  title: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { fontSize: 15, color: colors.text },
  cancel: { paddingVertical: 14, alignItems: "center" },
  cancelText: { color: colors.muted, fontWeight: "600" },
});
