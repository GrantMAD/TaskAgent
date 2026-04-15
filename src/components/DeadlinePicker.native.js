import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';

const DeadlinePicker = ({ value, onChange, show, setShow }) => {
    if (!show) return null;

    return (
        <DateTimePicker
            value={value || new Date()}
            mode="datetime"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
                setShow(false);
                if (selectedDate) {
                    onChange(selectedDate);
                }
            }}
        />
    );
};

export default DeadlinePicker;
