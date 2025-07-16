-- Generate diverse profiles to test browsing criteria

-- Insert more diverse users and profiles
DO $$
DECLARE
    user_id_val INTEGER;
    first_names_homme TEXT[] := ARRAY['Alexandre', 'Antoine', 'Arthur', 'Baptiste', 'Benjamin', 'Clément', 'Damien', 'David', 'Émile', 'Fabien', 'Gabriel', 'Hugo', 'Julien', 'Kévin', 'Lucas', 'Marc', 'Maxime', 'Nicolas', 'Olivier', 'Paul', 'Pierre', 'Quentin', 'Raphaël', 'Sébastien', 'Thomas', 'Valentin', 'Xavier', 'Yann', 'Zacharie'];
    first_names_femme TEXT[] := ARRAY['Amélie', 'Anaïs', 'Camille', 'Céline', 'Charlotte', 'Chloé', 'Claire', 'Émilie', 'Emma', 'Jade', 'Julie', 'Léa', 'Léna', 'Manon', 'Marie', 'Mathilde', 'Océane', 'Pauline', 'Sarah', 'Sophie', 'Stella', 'Zoé', 'Inès', 'Laura', 'Lucie', 'Nadia', 'Nathalie', 'Noémie', 'Romane', 'Victoire'];
    last_names TEXT[] := ARRAY['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefèvre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez'];
    cities TEXT[] := ARRAY['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Angers', 'Grenoble', 'Dijon', 'Nîmes', 'Aix-en-Provence', 'Brest', 'Le Mans', 'Amiens', 'Tours', 'Limoges', 'Clermont-Ferrand', 'Villeurbanne', 'Besançon'];
    interests TEXT[] := ARRAY['Musique', 'Cinéma', 'Lecture', 'Sport', 'Gaming', 'Art', 'Cuisine', 'Voyages', 'Photo', 'Théâtre', 'Natation', 'Cyclisme', 'Randonnée', 'Guitare', 'Piano', 'Danse', 'Yoga', 'Jardinage', 'Animaux', 'Œnologie', 'Surf', 'Cirque', 'Esport', 'Sciences', 'Écriture', 'Karaoké', 'Basketball', 'Football', 'Tennis', 'Volleyball'];
    
    gender_val TEXT;
    first_name_val TEXT;
    last_name_val TEXT;
    username_val TEXT;
    email_val TEXT;
    age_val INTEGER;
    city_val TEXT;
    lat_val NUMERIC;
    lng_val NUMERIC;
    orientation_val TEXT;
    interests_val TEXT[];
    biography_val TEXT;
    
    i INTEGER;
    j INTEGER;
    temp_interests TEXT[];
    rand_val NUMERIC;
    
    paris_lat NUMERIC := 48.8566;
    paris_lng NUMERIC := 2.3522;
    radius NUMERIC := 0.5;
    
BEGIN
    -- Generate 150 diverse profiles
    FOR i IN 1..150 LOOP
        -- Alternate gender for balanced distribution
        IF i % 2 = 1 THEN
            gender_val := 'homme';
            first_name_val := first_names_homme[1 + (random() * (array_length(first_names_homme, 1) - 1))::integer];
        ELSE
            gender_val := 'femme';
            first_name_val := first_names_femme[1 + (random() * (array_length(first_names_femme, 1) - 1))::integer];
        END IF;
        
        last_name_val := last_names[1 + (random() * (array_length(last_names, 1) - 1))::integer];
        username_val := lower(first_name_val) || lower(last_name_val) || (random() * 1000)::integer;
        email_val := username_val || '@example.com';
        
        -- Check if user already exists
        IF EXISTS (SELECT 1 FROM users WHERE email = email_val OR username = username_val) THEN
            CONTINUE;
        END IF;
        
        -- Age distribution (18-45)
        age_val := 18 + (random() * 27)::integer;
        
        -- City and location
        city_val := cities[1 + (random() * (array_length(cities, 1) - 1))::integer];
        lat_val := paris_lat + (random() - 0.5) * radius;
        lng_val := paris_lng + (random() - 0.5) * radius;
        
        -- Sexual orientation distribution: 75% hetero, 15% bi, 10% homo
        rand_val := random();
        IF rand_val < 0.1 THEN
            orientation_val := 'homo';
        ELSIF rand_val < 0.25 THEN
            orientation_val := 'bi';
        ELSE
            orientation_val := 'hetero';
        END IF;
        
        -- Generate 3-7 random interests
        temp_interests := ARRAY[]::TEXT[];
        FOR j IN 1..(3 + (random() * 4)::integer) LOOP
            temp_interests := array_append(temp_interests, interests[1 + (random() * (array_length(interests, 1) - 1))::integer]);
        END LOOP;
        interests_val := temp_interests;
        
        -- Generate biography
        IF gender_val = 'homme' THEN
            biography_val := 'Passionné de ' || interests_val[1] || ' et ' || interests_val[2] || ', je cherche une complicité sincère pour partager de beaux moments.';
        ELSE
            biography_val := 'Amoureuse de ' || interests_val[1] || ' et ' || interests_val[2] || ', je cherche quelqu''un pour partager mes passions et créer de beaux souvenirs.';
        END IF;
        
        -- Insert user
        INSERT INTO users (email, username, password_hash, first_name, last_name, is_verified, created_at)
        VALUES (email_val, username_val, '$2b$12$' || substr(md5(username_val || 'password'), 1, 22), first_name_val, last_name_val, true, NOW())
        RETURNING id INTO user_id_val;
        
        -- Insert profile
        INSERT INTO profiles (user_id, biography, age, gender, sexual_orientation, interests, city, location_lat, location_lng, fame_rating, created_at)
        VALUES (user_id_val, biography_val, age_val, gender_val, orientation_val, interests_val, city_val, lat_val, lng_val, 10 + (random() * 40)::integer, NOW());
        
        -- Insert placeholder photo
        INSERT INTO photos (user_id, filename, image_data, is_profile_picture, upload_date)
        VALUES (user_id_val, 'placeholder-' || gender_val || '-' || user_id_val || '.jpg', 
                'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCI+UGhvdG88L3RleHQ+PC9zdmc+',
                true, NOW());
        
        -- Show progress every 10 profiles
        IF i % 10 = 0 THEN
            RAISE NOTICE 'Generated % profiles...', i;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Profile generation completed! Generated 150 diverse profiles.';
END $$;