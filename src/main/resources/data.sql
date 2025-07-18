-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default users
INSERT IGNORE INTO users (username, password, name, role) VALUES
('admin', 'admin123', 'System Administrator', 'admin'),
('manager', 'manager123', 'Election Manager', 'admin'),
('voter1', 'voter123', 'John Doe', 'user'),
('voter2', 'voter123', 'Jane Smith', 'user');
