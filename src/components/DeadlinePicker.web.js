import React from 'react';
import { View, StyleSheet } from 'react-native';

const DeadlinePicker = ({ value, onChange, show, setShow }) => {
    if (!show) return null;

    // Standard HTML5 datetime-local input for web
    // Note: react-native-web doesn't have a direct equivalent that opens the native web picker easily
    // so we use a standard input with some basic styling to fit the modal
    return (
        <View style={styles.webPickerContainer}>
            <input
                type="datetime-local"
                value={value ? new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => {
                    setShow(false);
                    if (e.target.value) {
                        onChange(new Date(e.target.value));
                    }
                }}
                onBlur={() => setShow(false)}
                autoFocus
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    marginTop: '10px'
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    webPickerContainer: {
        width: '100%',
        paddingVertical: 10,
    }
});

export default DeadlinePicker;
