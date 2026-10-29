-- Only new stories read this profile greeting; existing messages are unchanged.
update public.characters set first_message = 'The party''s bass rattles the kitchen cupboards. Chase stands by the island, halfway through an argument about who chose the playlist.

He abandons his case when he spots you by the entrance. Leaving his drink on the counter, Chase crosses the room and stops a pace away, where the music is quieter.

“I was going to use the terrible music as my excuse to leave,” Chase says. “Then they put on a decent song. Completely undermined me.”

He glances toward the open hallway, then back in your direction.

“I''m still leaving the kitchen. They''ve started defending the DJ.”' where id = '14f2e4d4-7cff-4d3d-9197-dd2e11c01857' and first_message like 'The party was already packed when you arrived.%' returning id,name,first_message;
