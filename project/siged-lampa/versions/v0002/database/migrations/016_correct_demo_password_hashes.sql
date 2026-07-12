UPDATE users
SET password_hash = CASE username
    WHEN 'admin' THEN '$2b$10$A4qRigL.IFR5LnFjoXVEmeg0vFrxpwrQZ/vRN1lPCHltdzF114fhC'
    WHEN 'funcionario' THEN '$2b$10$npNzJxsLf/bYd0bphY9AG.cnKqmD/Ov6lTmXC6D7gsZtgQYCh0452'
    WHEN 'revisor' THEN '$2b$10$NkXKYnX8hEbMHZgvSYAzae1FAjOESkche1fFQE.NN1K6UXpBT2OOe'
    ELSE password_hash
END
WHERE username IN ('admin', 'funcionario', 'revisor');

UPDATE citizen_accounts
SET password_hash = '$2b$10$CHV6iCiezohzcGpt7T5EMOd0gh5HQ7.k5hPFQVcc4EFuLTaEoau/q'
WHERE email = 'ciudadano@email.com';
