import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

const TaskMap = ({ latitude, longitude, title }) => {
    return (
        <MapView
            style={styles.map}
            initialRegion={{
                latitude: latitude,
                longitude: longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
        >
            <Marker
                coordinate={{
                    latitude: latitude,
                    longitude: longitude,
                }}
                title={title}
            />
        </MapView>
    );
};

const styles = StyleSheet.create({
    map: {
        width: '100%',
        height: '100%',
    },
});

export default TaskMap;
