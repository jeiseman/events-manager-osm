<?php
if( !defined('WPMU_PLUGIN_DIR') ) define( 'WPMU_PLUGIN_DIR', dirname(__FILE__).'/wp-content/wp-safe-mode' ); //WP Safe Mode
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the website, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://developer.wordpress.org/advanced-administration/wordpress/wp-config/
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'mafwor5_wp400' );

/** Database username */
define( 'DB_USER', 'mafwor5_wp400' );

/** Database password */
define( 'DB_PASSWORD', 'a5uJS[)1p5' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

define( 'WP_DEBUG', true );
define( 'WP_DEBUG_DISPLAY', false );
define( 'WP_DEBUG_LOG', true );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',         '9yaqw4nxaj700jqx2uvhrx82jktxywkghk8pgrl7bsy5azcqsahdb7jg4xq5ztf2' );
define( 'SECURE_AUTH_KEY',  'lojse4ffhjreawbbyru73futrfo3mv5u6w01pcstugmjydur3xo1aogwom53trsz' );
define( 'LOGGED_IN_KEY',    'cs2as69bcnjdahaejstjjizpdhymnpiuskrgvtvmrcdkmhpphe5yax1u34bomxzs' );
define( 'NONCE_KEY',        'qyqkswubzdm8hgwqbftwmonw6nscr5vqg31ypvfpszqm3lawkhufguuhiqxjpk7n' );
define( 'AUTH_SALT',        'ygn8iqfrpfg34slialuffef5oiukodftqaovz2u5sfiqmzb9r2si2irjytkpeend' );
define( 'SECURE_AUTH_SALT', 'gsskacjvivikrnzwoarz5iyngqkqtiazoy5mtlli1pqqht8y2nsn6g20j00fs4pp' );
define( 'LOGGED_IN_SALT',   'w9ggvg1dtadltqx3wmdiwbgrfmw4sbo5ltvm9f1c1didljswcdlqa0ipiaq8lclv' );
define( 'NONCE_SALT',       'uxf7upt6czozsc2jxpsb54a4iqbip50bsmtsthqbfds7kiydtoacybd5nasuldew' );

/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 *
 * At the installation time, database tables are created with the specified prefix.
 * Changing this value after WordPress is installed will make your site think
 * it has not been installed.
 *
 * @link https://developer.wordpress.org/advanced-administration/wordpress/wp-config/#table-prefix
 */
$table_prefix = 'wpjy_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://developer.wordpress.org/advanced-administration/debug/debug-wordpress/
 */
define( 'WP_DEBUG', false );

/* Add any custom values between this line and the "stop editing" line. */

define( 'EM_CONDITIONAL_RECURSIONS', 2 );
// define( 'EM_GUTENBERG', true );


/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
