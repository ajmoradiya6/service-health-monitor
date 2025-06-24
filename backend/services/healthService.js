const path = require('path');
const fs = require('fs').promises;
const { summarizeLogForUser } = require('../utils/openRouterLLM');

const servicesFilePath = path.join(__dirname, '..', '..' ,'database', 'RegisteredServices.json');

async function getAllServices() {
    try {
        const fileContent = await fs.readFile(servicesFilePath, 'utf8');
        const services = fileContent ? JSON.parse(fileContent) : [];
        return services;

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`Services file not found at ${servicesFilePath}, returning an empty array.`);
            return [];
        } else {
            console.error('Error reading services file:', error);
            throw error;
        }
    }
}

async function updateService(serviceId, updatedService) {
    try {
        const services = await getAllServices(); // Read existing services
        const index = services.findIndex(service => service.id === serviceId);

        if (index === -1) {
            throw new Error(`Service with ID ${serviceId} not found.`);
        }

        // Update the service properties
        services[index] = { ...services[index], ...updatedService };

        // Write the updated array back to the file
        await fs.writeFile(servicesFilePath, JSON.stringify(services, null, 2), 'utf8');
        console.log(`Service with ID ${serviceId} updated successfully.`);

    } catch (error) {
        console.error('Error updating service:', error);
        throw error; // Re-throw the error for the caller to handle
    }
}

async function deleteService(serviceId) {
    try {
        const services = await getAllServices(); // Read existing services
        const initialLength = services.length;
        const updatedServices = services.filter(service => service.id !== serviceId);

        if (updatedServices.length === initialLength) {
            // No service was deleted, meaning the ID wasn't found
            throw new Error(`Service with ID ${serviceId} not found.`);
        }

        // Write the updated array back to the file
        await fs.writeFile(servicesFilePath, JSON.stringify(updatedServices, null, 2), 'utf8');
        console.log(`Service with ID ${serviceId} deleted successfully.`);

    } catch (error) {
        console.error('Error deleting service:', error);
        throw error; // Re-throw the error for the caller to handle
    }
}

/**
 * Example function to process a log and generate a user-friendly notification.
 * Call this function when you want to create a notification from a log entry.
 * @param {string} logMessage - The technical log message.
 * @returns {Promise<string>} - The user-friendly notification message.
 */
async function createUserNotificationFromLog(logMessage) {
  // Only process error or warning logs for notifications
  // You can add your own logic to filter log types here
  const userFriendlyMessage = await summarizeLogForUser(logMessage);
  // Here, you would save/display the userFriendlyMessage in your notification system
  return userFriendlyMessage;
}

module.exports = { getAllServices, updateService, deleteService, createUserNotificationFromLog };
