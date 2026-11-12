package com.company.visitor.config;

import com.zaxxer.hikari.HikariDataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SQLite does not create the parent directory of a database file, and it only tolerates a
 * single writer. This configuration makes sure the directory exists before Hikari opens the
 * database and serialises writes through a one-connection pool.
 */
@Configuration
@EnableConfigurationProperties(DataSourceProperties.class)
public class SqliteDataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(SqliteDataSourceConfig.class);

    @Bean
    public DataSource dataSource(DataSourceProperties properties) {
        String url = properties.getUrl();
        prepareDirectory(url);
        HikariDataSource dataSource = properties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
        dataSource.setMaximumPoolSize(1);
        dataSource.setConnectionInitSql("PRAGMA busy_timeout = 5000");
        log.info("SQLite datasource initialised: {}", url);
        return dataSource;
    }

    static void prepareDirectory(String url) {
        if (url == null || !url.startsWith("jdbc:sqlite:")) {
            return;
        }
        String rawPath = url.substring("jdbc:sqlite:".length());
        int queryIndex = rawPath.indexOf('?');
        if (queryIndex >= 0) {
            rawPath = rawPath.substring(0, queryIndex);
        }
        if (rawPath.isEmpty() || ":memory:".equals(rawPath) || rawPath.startsWith("file:")) {
            return;
        }
        Path parent = Path.of(rawPath).toAbsolutePath().getParent();
        if (parent == null) {
            return;
        }
        try {
            Files.createDirectories(parent);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create SQLite directory " + parent, e);
        }
    }
}
