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
  Total_Space int DEFAULT NULL,
  Area_ft2 decimal(15,2) DEFAULT NULL,
  iata_code varchar(10) DEFAULT NULL,
  id int NOT NULL AUTO_INCREMENT,
  Priority int NOT NULL,
  PRIMARY KEY (id),
  KEY idx_airport_fbo (Airport_Code,FBO_Name)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO airport_parking VALUES
('KTEB','Atlantic Aviation',13,678710.89,'TEB',1,1),
('KTEB','Jet Aviation',10,996916.37,'TEB',2,2),
('KTEB','Signature Aviation East',9,254913.75,'TEB',3,3),
('KTEB','Signature Aviation South',23,620609.34,'TEB',4,4),
('KTEB','Signature Aviation West',10,283136.05,'TEB',5,5),
('KHPN','Million Air',22,574335.79,'HPN',6,1),
('KHPN','NetJets HPN Facility Bldg 6',1,30000.00,'HPN',7,2),
('KHPN','NetJets HPN Hangar 26',2,15000.00,'HPN',8,3),
('KHPN','Signature Aviation East',7,205216.15,'HPN',9,4),
('KHPN','Signature Aviation West',6,166488.70,'HPN',10,5),
('KPBI','Atlantic Aviation N236MJ',7,206450.47,'PBI',11,2),
('KPBI','Atlantic Aviation FKA Galaxy',7,206479.40,'PBI',12,1),
('KPBI','NetJets',16,429275.22,'PBI',13,3),
('KPBI','Signature',17,450511.60,'PBI',14,4),
('KLAS','Atlantic Aviation',11,307333.81,'LAS',15,1),
('KLAS','Caesars Hanger/Paradise Hangar',1,33697.04,'LAS',16,2),
('KLAS','Signature Flight Support',6,180215.56,'LAS',17,3),
('KBOS','Signature Aviation',5,145626.97,'BOS',18,1),
('KJAC','Jackson Hole Flight Services',4,105450.04,'JAC',19,1),
('KMDW','Atlantic',4,120637.16,'MDW',20,1),
('KMDW','Signature',3,100136.39,'MDW',21,2),
('KMDW','Signature Flight South (Hangar 23)',0,15896.35,'MDW',22,3),
('KMDW','Signature South',6,160546.32,'MDW',23,4),
('KSDL','Atlantic Aviation',4,114259.52,'SCF',24,1),
('KSDL','Hangar 1 (PVT/PNR)',2,75537.32,'SCF',25,2),
('KSDL','Jet Aviation',3,98873.84,'SCF',26,3),
('KSDL','NetJets',6,161172.18,'SCF',27,4),
('KSDL','Signature Flight Support',7,203346.99,'SCF',28,5),
('KDAL','Areo Star Aviation Main Hangar',1,30000.00,'DAL',29,1),
('KDAL','Bombardier Aerospace',4,104590.11,'DAL',30,2),
('KDAL','Signature Flight Support Terminal 1',6,169277.33,'DAL',31,3),
('KDAL','Signature Flight Support Terminal 2',6,167876.04,'DAL',32,4),
('KEGE','NetJets',9,244956.53,'EGE',33,1),
('KEGE','Signature',14,373383.53,'EGE',34,2),
('KMST','masters parking',8,117788.85,'MST',102,1);
