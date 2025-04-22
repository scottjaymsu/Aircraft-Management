# Airport Capacity and Ground Space Management 

## Description

A full stack web application developed for NetJets to provide real-time and projected capacities at airports. This application can provide recommendations, such as where to move aircraft in order to provide space for incoming flights, as well as simulate projected parking scenarios for planned flights for estimating the capacity at specific FBOs. Airport and FBO data can be added manually by batch file. FBOs can also be drawn by the user in addition to the batch file upload.


## Tech Stack 

**Front End**

* React.js
* Google Maps API
* JavaScript
* HTML
* CSS

**Back End**
* Node.js
* JavaScript

**Database**
* MySQL

**DevOps and Infra**
* AWS Amplify
* Docker
* GitLab

## Getting started

1. Install Dependencies 

```
cd client
npm install
```

```
cd server
npm install
```

2. Running Project
```
cd client
npm start
```

```
cd server
node index.js
```

## Okta Login
Currently, okta is set up with a sample dev account. It will need to be integrated with the internal Okta system for NetJets. All account creation, editing, and deletion is done through Okta. Okta is implemented using the Okta-hosted Sign-in Widget to redirect the users to authenticate, then redirect back to the app. This is the recommended approach by Okta.

**Sample User:**

Username: 
```
test@dev.com
```
Password:
```
NetJetsSampleAccount
```

## Main Map Page
![alt text](README_images/map_page_overview.png)
The map page serves as a landing page for the user, as well as provides an overview on the statuses of airports all across the United States. Here, users can easily navigate to their desired airport through either the search function in the top right corner, or by clicking on the airport's icon. 

The notification center is accessed through the icon in the top right corner. Here, notifications are displayed for any airport who's status may be a concern for overcapacity scenarios. 

Airport icons are displayed two ways. When they do not yet have FBOs set up, they display as the navy dot. When FBO data is added for an airport, it will display as the downward facing arrow, which changes color based on the capacity of the airport. Above the arrow, the current capacity is displayed through a fill bar for quick reference. To see the actual percentage, a user can look for the airport in the menu in the top left corner.  

To access the Summary Page, click on either the icon associated with the desired airport, or click on the name of the airport in the dropdown menu. 

To access the Batch File Upload page, click on the "Add Data" button. 

## Summary Page
The summary page gives the user a closer look into a specific airport. At the top, there is a percentage that represents the status of the capacity filled of the entire airport. To the right, the page displays a satellite photo of the airport selected with the FBOs labeled and outlined in the color associated with their current capacity. 
![alt text](README_images/summary_page.png)
The Traffic Overview gives a hourly look into the projected and historical population of the airport. It displays the count of planes that are arriving, departing, or parked. A legend is provided for ease of use. 
![alt text](README_images/arriving_departing_tables.png)
The Arriving Flights and Departing Flights table allow the user to see any incoming or departing flights in the upcoming hours from the currently selected airport. It gives information like the plane footprint and size to assist in planning. 
![alt text](README_images/FBO_table_open_parking.png)
The FBOs table shows the user the FBOs at the current airport. Their current capacity status is shown with a percentage, and the color correlates with the outline of the FBO shown on the map. The priority shown determines the order in which they will be filled, and can be edited by selecting the "Edit FBO" button. 

The Open Parking by Aircraft Type table tells the user how many of each type of aircraft can fit in the remaining space of the selected FBO once a user selects one by clicking the "Select FBO" button.

The Recommendation page can be accessed by clicking the "See more" button at the bottom of the page. 

## Batch File Upload Page
The Batch File Upload page allows a user to upload a batch file of either airport data or specific FBO data. 

A user can download an example CSV file to get an idea of the required structure by clicking the "Download Example" button. 
To upload a created file, a user can click the "Choose File" button and select the desired file from their computer. 

![alt text](README_images/airport_data_upload.png)
A user can select the "Airport Data Upload" tab, upload a CSV file with the correct information about the new airport, and the application will create a new airport to be used to track capacity. An example situation where this feature may be useful is when an owner wants to create their own temporary airport. 

![alt text](README_images/fbo_data_upload.png)
When a user clicks the "FBO Data Upload" tab, they can upload relevant information about the FBO that they want to add to the system. Although FBOs can be added on the summary page, this feature can be used to populate multiple FBOs rapidly with just a CSV file. 

## Recommendation Engine and Simulator Constraints
Both the Recommendation Engine and the Simulator assume that planes are parked in a non-stacked format with padding between them. It does not account for other ways of organizing planes within an FBO
![alt text](README_images/parking_visual.png)

A current work around is to create different parking areas of the rows of aircraft with the "Edit FBO" feature on the Summary Page

Feeder airports have not been implemented due to that not being the current mode of operations for NetJets, but it can be added at a later date once that occupational model is implemented. 


## SWIM Data
- Reference README in flight-data-scraping


## Authors and acknowledgment
- MSU Capstone Team: Ryan MacDonald, Kendall Korcek, Jay Scott, Emily Telgenhoff, Ben Grycza, Ryann Seymour
- A special thanks to: Kyle Sims, Amadou Anne, Morgan Schall, Lee Hoxworth