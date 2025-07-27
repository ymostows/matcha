-- Create some test likes and matches
-- Get the user IDs from our test profiles
WITH test_users AS (
    SELECT u.id, u.username, p.gender 
    FROM users u 
    JOIN profiles p ON u.id = p.user_id 
    WHERE u.username IN ('thomas_girard', 'antoine_bernard', 'maxime_garcia', 'sarah_meunier', 'alexandre_martin', 'gabriel_simon', 'paul_fournier', 'julie_olivier', 'damien_petit', 'marie_lemoine')
    AND u.is_verified = true
),
cross_likes AS (
    -- Thomas likes Sarah and Marie
    SELECT 
        (SELECT id FROM test_users WHERE username = 'thomas_girard') as liker_id,
        (SELECT id FROM test_users WHERE username = 'sarah_meunier') as liked_id,
        true as is_like
    UNION ALL
    SELECT 
        (SELECT id FROM test_users WHERE username = 'thomas_girard') as liker_id,
        (SELECT id FROM test_users WHERE username = 'marie_lemoine') as liked_id,
        true as is_like
    UNION ALL
    -- Sarah likes Thomas back (creates a match)
    SELECT 
        (SELECT id FROM test_users WHERE username = 'sarah_meunier') as liker_id,
        (SELECT id FROM test_users WHERE username = 'thomas_girard') as liked_id,
        true as is_like
    UNION ALL
    -- Marie likes Thomas back (creates a match)
    SELECT 
        (SELECT id FROM test_users WHERE username = 'marie_lemoine') as liker_id,
        (SELECT id FROM test_users WHERE username = 'thomas_girard') as liked_id,
        true as is_like
    UNION ALL
    -- Antoine likes Julie
    SELECT 
        (SELECT id FROM test_users WHERE username = 'antoine_bernard') as liker_id,
        (SELECT id FROM test_users WHERE username = 'julie_olivier') as liked_id,
        true as is_like
    UNION ALL
    -- Julie likes Antoine back (creates a match)
    SELECT 
        (SELECT id FROM test_users WHERE username = 'julie_olivier') as liker_id,
        (SELECT id FROM test_users WHERE username = 'antoine_bernard') as liked_id,
        true as is_like
    UNION ALL
    -- Maxime likes Sarah
    SELECT 
        (SELECT id FROM test_users WHERE username = 'maxime_garcia') as liker_id,
        (SELECT id FROM test_users WHERE username = 'sarah_meunier') as liked_id,
        true as is_like
    UNION ALL
    -- Sarah likes Maxime back (creates a match)
    SELECT 
        (SELECT id FROM test_users WHERE username = 'sarah_meunier') as liker_id,
        (SELECT id FROM test_users WHERE username = 'maxime_garcia') as liked_id,
        true as is_like
)

-- Insert the likes
INSERT INTO likes (liker_id, liked_id, is_like, created_at)
SELECT liker_id, liked_id, is_like, CURRENT_TIMESTAMP - (random() * interval '7 days')
FROM cross_likes
WHERE liker_id IS NOT NULL AND liked_id IS NOT NULL
ON CONFLICT (liker_id, liked_id) DO NOTHING;

-- Create matches for mutual likes
INSERT INTO matches (user1_id, user2_id, created_at)
SELECT 
    LEAST(l1.liker_id, l1.liked_id) as user1_id,
    GREATEST(l1.liker_id, l1.liked_id) as user2_id,
    CURRENT_TIMESTAMP - (random() * interval '5 days')
FROM likes l1
WHERE l1.is_like = true
  AND EXISTS (
    SELECT 1 FROM likes l2 
    WHERE l2.liker_id = l1.liked_id 
      AND l2.liked_id = l1.liker_id 
      AND l2.is_like = true
  )
ON CONFLICT (user1_id, user2_id) DO NOTHING;

-- Check the results
SELECT 'Likes created:' as info, COUNT(*) as count FROM likes WHERE created_at > CURRENT_TIMESTAMP - interval '1 minute';
SELECT 'Matches created:' as info, COUNT(*) as count FROM matches WHERE created_at > CURRENT_TIMESTAMP - interval '1 minute';