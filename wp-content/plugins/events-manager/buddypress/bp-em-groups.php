<?php
/**
 * Turns an event private if the event belongs to a private BP Group
 * @param EM_Event $EM_Event
 */
function bp_em_group_event_save($result, $EM_Event){
	if( is_object($EM_Event) && !empty($EM_Event->event_id) ){
		if( !empty($_REQUEST['group_id']) && is_numeric($_REQUEST['group_id']) && bp_is_active('groups') ){
		    //firstly, we check that the event has been published, otherwise users without publish rights can submit an event at a private group and event is marked private/published immediately
		    if( $EM_Event->event_status == 1 ){
    			//we have been requested an event creation tied to a group, so does this group exist, and does this person have admin rights to it?
    			if( groups_is_user_admin(get_current_user_id(), absint($_REQUEST['group_id']) ) ){
    				$EM_Event->group_id = absint($_REQUEST['group_id']);
    			}
    			if( !empty($EM_Event->group_id) ){
    				//if group is private, make it private
    				$group = groups_get_group(array('group_id'=>$EM_Event->group_id));
    				$is_member = groups_is_user_member(get_current_user_id(), $EM_Event->group_id) || groups_is_user_admin(get_current_user_id(), $EM_Event->group_id) || groups_is_user_mod(get_current_user_id(), $EM_Event->group_id);
    				if( $group->status != 'public' && $is_member ){
    					//Make sure event status is private and set post status to private
    					global $wpdb;
    					$EM_Event->event_private = 1;
    					$wpdb->update($wpdb->posts, array('post_status'=>'private'), array('ID'=>$EM_Event->post_id));
    					$wpdb->update(EM_EVENTS_TABLE, array('event_private'=>1), array('event_id'=>$EM_Event->event_id));
    				}
    			}
		    }
		}else{
			$EM_Event->group_id = null;
		}
	}
	return $result;
}
add_action('em_event_save','bp_em_group_event_save',1,2);

/**
 * Overrides the default capability of the user for another owner's event if the user is a group admin and the event belongs to a group. 
 * User must have the relevant permissions globally in order to inherit that capability for this event as well.
 * @param boolean $result
 * @param EM_Event $EM_Event
 */
function bp_em_group_event_can_manage( $result, $EM_Event, $owner_capability, $admin_capability, $user_to_check){
	if( !$result && $EM_Event->event_owner != get_current_user_id() && !empty($EM_Event->group_id) && bp_is_active('groups') ){ //only override if already false, incase it's true
	    //if the user is an admin of this group, and actually has the relevant permissions globally, they can manage this event
	    $EM_Object = new EM_Object(); //create new object to prevent infinite loop should we call $EM_Event->can_manage();
		if( groups_is_user_admin(get_current_user_id(),$EM_Event->group_id) && $EM_Object->can_manage($owner_capability, $admin_capability, $user_to_check) ){
			//This user is an admin of the owner's group, so they can edit this event.
			array_pop($EM_Event->errors); //remove last error
			return true;
		}else{
		    $EM_Event->add_error($EM_Object->get_errors()); //add any applicable errors
		}
	}
	return $result;
}
add_filter('em_event_can_manage','bp_em_group_event_can_manage',1,5);


function bp_em_group_events_accepted_searches($searches){
	if( bp_is_active('groups') ){
		$searches[] = 'group';
	}
	return $searches;
}
add_filter('em_accepted_searches','bp_em_group_events_accepted_searches',1,1);

/**
 * Parser Function: Handles group IDs, slugs, and special keywords.
 *
 * This version can parse a comma-separated list containing numeric group IDs
 * or string-based group slugs, converting slugs to IDs for the query.
 */
function bp_em_group_events_get_default_search($searches, $array) {
    // 1. Pass through native Events Manager attributes first.
    if (array_key_exists('group__in', $array) && !array_key_exists('group__in', $searches)) {
        $searches['group__in'] = $array['group__in'];
    }
    if (array_key_exists('group__not_in', $array) && !array_key_exists('group__not_in', $searches)) {
        $searches['group__not_in'] = $array['group__not_in'];
    }

    // 2. If the 'group' attribute isn't set, we're done.
    if (!isset($array['group']) || !bp_is_active('groups')) {
        return $searches;
    }

    // Sanitize the input as a best practice.
    $group_attr = is_string($array['group']) ? sanitize_text_field($array['group']) : $array['group'];

    // 3. Handle special, non-list keywords.
    if ($group_attr === 'this' && is_numeric(bp_get_current_group_id())) {
        $searches['group_in'] = [bp_get_current_group_id()];
        unset($searches['group']);
        return $searches;
    }
    if ($group_attr === 'my' && is_user_logged_in()) {
        $searches['group'] = 'my';
        return $searches;
    }
    if ($group_attr === '0' || $group_attr === 0) {
        $searches['group_is_none'] = true;
        unset($searches['group']);
        return $searches;
    }

    // 4. Parse the comma-separated list of IDs and/or slugs.
    $group_ids_to_include = [];
    $group_ids_to_exclude = [];
    $items = explode(',', (string)$group_attr);

    foreach ($items as $item) {
        $trimmed_item = trim($item);
        if (empty($trimmed_item)) continue;

        $is_exclusion = strpos($trimmed_item, '-') === 0;
        $value = $is_exclusion ? substr($trimmed_item, 1) : $trimmed_item;
        $group_id = 0;

        if (is_numeric($value)) {
            $group_id = absint($value);
        } else {
            $group_id = groups_get_id($value);
        }

        if ($group_id > 0) {
            if ($is_exclusion) {
                $group_ids_to_exclude[] = $group_id;
            } else {
                $group_ids_to_include[] = $group_id;
            }
        }
    }

    // 5. Assign the parsed ID lists and any necessary keywords.
    if (!empty($group_ids_to_include)) $searches['group_in'] = $group_ids_to_include;
    if (!empty($group_ids_to_exclude)) $searches['group_notin'] = $group_ids_to_exclude;
    if (empty($group_ids_to_include) && !empty($group_ids_to_exclude)) $searches['group_must_exist'] = true;

    // 6. Unset the original 'group' key to prevent conflicts.
    if (!empty($group_ids_to_include) || !empty($group_ids_to_exclude)) unset($searches['group']);

    return $searches;
}
add_filter('em_events_get_default_search','bp_em_group_events_get_default_search',1,2);

/**
 * SQL Builder Function: Handles our custom search keys AND native EM keys.
 */
function bp_em_group_events_build_sql_conditions($conditions, $args) {
    // Handle group="0"
    if (!empty($args['group_is_none'])) {
        $conditions['group'] = "( `group_id` = 0 OR `group_id` IS NULL )";
    }

    // Handle group="-id"
    if (!empty($args['group_must_exist'])) {
        $conditions['group_exists'] = "( `group_id` IS NOT NULL AND `group_id` != 0 )";
    }

    // Handle IN conditions
    $include_ids = !empty($args['group_in']) ? $args['group_in'] : (!empty($args['group__in']) ? $args['group__in'] : []);
    if (!empty($include_ids) && is_array($include_ids)) {
        $ids_string = implode(',', array_map('absint', $include_ids));
        if (!empty($ids_string)) {
            $conditions['group'] = "( `group_id` IN ($ids_string) )";
        }
    }

    // Handle NOT IN conditions
    $exclude_ids = !empty($args['group_notin']) ? $args['group_notin'] : (!empty($args['group__not_in']) ? $args['group__not_in'] : []);
    if (!empty($exclude_ids) && is_array($exclude_ids)) {
        $ids_string = implode(',', array_map('absint', $exclude_ids));
        if (!empty($ids_string)) {
            $conditions['group_exclude'] = "( `group_id` NOT IN ($ids_string) )";
        }
    }

    // Handle 'my' groups
    if (!empty($args['group']) && $args['group'] == 'my') {
        if (is_user_logged_in()) {
            $groups = groups_get_user_groups(get_current_user_id());
            if (!empty($groups['groups'])) {
                $conditions['group'] = "( `group_id` IN (" . implode(',', $groups['groups']) . ") )";
            } else {
                $conditions['group'] = "( `group_id` IS NULL OR `group_id` = 0 )";
            }
        }
    }

    // Deal with private groups and events
    if (is_user_logged_in()) {
        $group_ids = BP_Groups_Member::get_group_ids(get_current_user_id());
        if (!empty($group_ids['groups'])) {
            $user_groups_string = implode(',', $group_ids['groups']);
            $conditions['group_privacy'] = "(`event_private`=0 OR (`event_private`=1 AND (`group_id` IS NULL OR `group_id` = 0)) OR (`event_private`=1 AND `group_id` IN ({$user_groups_string})))";
        } else {
            $conditions['group_privacy'] = "(`event_private`=0 OR (`event_private`=1 AND (`group_id` IS NULL OR `group_id` = 0)))";
        }
    }

    return $conditions;
}
add_filter('em_events_build_sql_conditions','bp_em_group_events_build_sql_conditions',1,2);

	
/**
 * Checks if the event is private and either belongs to a group or private group, as members of that group should be able to see the post even if not able to see private events. 
 * @param string $template
 * @return string
 */
function bp_em_private_event_check($template){
	global $post, $wpdb, $wp_query, $bp;
	if( $post->post_type == EM_POST_TYPE_EVENT ){
		$EM_Event = em_get_event($post);
		//echo "<pre>"; print_r($EM_Event); echo "</pre>"; die();
		if( !empty($EM_Event->event_private) && !empty($EM_Event->group_id) ){
			if( is_user_logged_in() ){
				//make sure user is a member of this group, whether private or not, private groups just aren't shown to non-members of a group
				$id_lookup = $wpdb->get_var( $wpdb->prepare( "SELECT m.group_id FROM {$bp->groups->table_name_members} m WHERE m.group_id = %s AND m.user_id = %d AND m.is_confirmed = 1 AND m.is_banned = 0", $EM_Event->group_id, get_current_user_id() ) );
				if($id_lookup != $EM_Event->group_id){
					unset($post);
					$wp_query->set_404();
					$template = locate_template(array('404.php'),false);
				}
			}else{
				unset($post);
				$wp_query->set_404();
				$template = locate_template(array('404.php'),false);
			}
		}
	}
	return $template;
}
add_filter('single_template','bp_em_private_event_check',20);

/*
 * Admin Meta Boxes
 */
function bp_em_meta_boxes(){
	add_meta_box('em-event-group', __('Group Ownership','events-manager'), 'bp_em_meta_box_group',EM_POST_TYPE_EVENT, 'side','low');
	add_meta_box('em-event-group', __('Group Ownership','events-manager'), 'bp_em_meta_box_group','event-recurring', 'side','low');
}
add_action('add_meta_boxes', 'bp_em_meta_boxes');
	
function bp_em_meta_box_group(){
	em_locate_template('forms/event/group.php',true);

}
