<?php
/**
 * Plugin Name: Events Manager - OpenStreetMap
 * Plugin URI: https://www.example.com/
 * Description: Adds OpenStreetMap as an alternative to Google Maps for displaying locations in Events Manager.
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://www.example.com/
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: events-manager-osm
 * Domain Path: /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function em_osm_add_map_type_setting( $map_types ) {
	$map_types['osm'] = 'OpenStreetMap';
	return $map_types;
}
add_filter( 'em_settings_google_maps_options', 'em_osm_add_map_type_setting' );

function em_osm_enqueue_scripts() {
	if ( get_option( 'dbem_gmap_type' ) === 'osm' ) {
		// Enqueue Leaflet.js
		wp_enqueue_style( 'leaflet', 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css', array(), '1.7.1' );
		wp_enqueue_script( 'leaflet', 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js', array(), '1.7.1', true );

		// Enqueue our custom OSM script
		wp_enqueue_script( 'events-manager-osm', plugins_url( 'events-manager-osm.js', __FILE__ ), array( 'jquery', 'leaflet', 'events-manager' ), '1.0.0', true );
	}
}
add_action( 'wp_enqueue_scripts', 'em_osm_enqueue_scripts', 20 );

function em_osm_admin_enqueue_scripts( $hook ) {
	if ( 'edit.php' !== $hook && 'post.php' !== $hook ) {
		return;
	}
	if ( get_option( 'dbem_gmap_type' ) === 'osm' ) {
		wp_enqueue_style( 'leaflet', 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css', array(), '1.7.1' );
		wp_enqueue_script( 'leaflet', 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js', array(), '1.7.1', true );
		wp_enqueue_script( 'events-manager-osm', plugins_url( 'events-manager-osm.js', __FILE__ ), array( 'jquery', 'leaflet', 'events-manager' ), '1.0.0', true );
	}
}
add_action( 'admin_enqueue_scripts', 'em_osm_admin_enqueue_scripts', 20 );
