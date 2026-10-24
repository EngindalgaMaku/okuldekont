-- İşletme ve öğretmen giriş kontrol ayarlarını ekle
INSERT IGNORE INTO system_settings (id, `key`, `value`) VALUES 
(UUID(), 'enable_company_login', 'true'),
(UUID(), 'enable_teacher_login', 'true');