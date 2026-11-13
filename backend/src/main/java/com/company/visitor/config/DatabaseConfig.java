package com.company.visitor.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Creates the SQLite data source. The parent directory of the database file is
 * created on startup so a fresh checkout works without manual setup.
 */
@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Bean
    public DataSource dataSource(@Value("${app.database.path:data/visitor.db}") String databasePath) throws IOException {
        Path dbPath = Paths.get(databasePath).toAbsolutePath().normalize();
        Path parent = dbPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:sqlite:" + dbPath + "?journal_mode=WAL&busy_timeout=5000");
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(1);
        config.setPoolName("sqlite-pool");
        config.setConnectionTestQuery("SELECT 1");
        log.info("SQLite database: {}", dbPath);
        return new HikariDataSource(config);
    }

    @Bean
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
