<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { userSession } from '$lib/store';
  import "../app.css"; // This should already be here from your Tailwind setup

  onMount(() => {
    // Checks if the user is already logged in from a previous session
    supabase.auth.getSession().then(({ data }) => {
      userSession.set(data.session);
    });

    // Listens for when the user logs in or out and updates the store
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      userSession.set(session);
    });

    // Cleanup the listener when the component is destroyed
    return () => {
      subscription.unsubscribe();
    };
  });
</script>

<slot />