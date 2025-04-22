CREATE TABLE flight_plans (
  flightRef varchar(10) NOT NULL,
  acid varchar(8) NOT NULL,
  departing_airport varchar(6) DEFAULT NULL,
  arrival_airport varchar(6) DEFAULT NULL,
  etd datetime DEFAULT NULL,
  eta datetime DEFAULT NULL,
  status enum('SCHEDULED','FLYING','ARRIVED','MAINTENANCE') DEFAULT NULL,
  fbo_id int DEFAULT NULL,
  PRIMARY KEY (flightRef),
  KEY parked_idx (arrival_airport)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE netjets_fleet (
  acid varchar(8) NOT NULL,
  plane_type varchar(6) DEFAULT NULL,
  flightRef varchar(10) NOT NULL,
  PRIMARY KEY (acid),
  UNIQUE KEY flightRef (flightRef)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE airport_parking (
  Airport_Code varchar(10) DEFAULT NULL,
  FBO_Name varchar(255) DEFAULT NULL,
  Parking_Space_Taken int DEFAULT NULL,
  Total_Space int DEFAULT NULL,
  Area_ft2 decimal(15,2) DEFAULT NULL,
  iata_code varchar(10) DEFAULT NULL,
  coordinates polygon DEFAULT NULL,
  id int NOT NULL AUTO_INCREMENT,
  Priority int NOT NULL,
  PRIMARY KEY (id),
  KEY idx_airport_fbo (Airport_Code,FBO_Name)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- INSERT INTO flight_plans VALUES
--     ('95007675', 'N100QS', 'TBPB', 'KMIA', NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 2 HOUR, 'FLYING'),
--     ('94907783', 'N101QS', 'TNCM', 'KTTN', NOW() - INTERVAL 3 HOUR, NOW() + INTERVAL 1 MINUTE, 'FLYING'),
--     ('94938743', 'N104QS', 'MBPV', 'KHPN', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 DAY, 'ARRIVED'),
--     ('94938900', 'N104QS', 'KHPN', 'KTEB', NOW() + INTERVAL 1 MINUTE, NOW() + INTERVAL 2 HOUR, 'SCHEDULED');


-- INSERT INTO netjets_fleet VALUES 
--     ('N100QS','GL5T','95007675'),
--     ('N101QS','GL5T','94907783'),
--     ('N104QS','GL5T','94938743'),
--     ('N109QS','GL5T','94930030'),
--     ('N110QS','GL5T','93943732'),
--     ('N111QS','GL5T','95234080'),
--     ('N112QS','GL5T','95101725'),
--     ('N113QS','GL5T','95055898'),
--     ('N114QS','GL5T','93499055'),
--     ('N115QS','GL5T','95209495');