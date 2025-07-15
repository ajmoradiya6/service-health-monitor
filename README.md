# Service Health Monitor

A simple dashboard that displays service health using pure HTML/CSS/JS and Node.js with properties files instead of a traditional database.


For me only

Backend
    - This folder is responsible for service-health-monitor backend only
    - Register service
    - Modify Serivce
    - Start and Stop Service
    - All operation related to the notifications
    - All operation related to user-settings 
    - LLM related setttings
    - SMS and Email configuration related logic

Frontend
    - Hit the endpoint /healthhub and get the data
    - Responsible to display data in organized way
    - All logic related to when to reload the page when to establish connection and all

Database
    - Stores all user related settings
    - Stores all registered services data