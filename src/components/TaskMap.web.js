import React from 'react';
import { View } from 'react-native';

const TaskMap = ({ latitude, longitude, title, Rounding }) => {
    return (
        <View style={{ width: '100%', height: '100%' }}>
            <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                style={{ border: 0, borderRadius: Rounding || 8 }}
            />
        </View>
    );
};

export default TaskMap;
