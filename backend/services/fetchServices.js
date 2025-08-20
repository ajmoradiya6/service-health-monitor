const { exec } = require('child_process');

async function runPowerShellCommand(command) {
    return new Promise((resolve, reject) => {
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${command}"`, { maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            if (stderr) {
                return reject(new Error(stderr));
            }
            resolve(stdout.trim());
        });
    });
}

async function getAllServices() {
    /*try {
        const fileContent = await fsp.readFile(servicesFilePath, 'utf8');
        const data = fileContent ? JSON.parse(fileContent) : {};
        return {
            windowsServices: Array.isArray(data.windowsServices) ? data.windowsServices : [],
            tomcatService: data.tomcatService || null
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { windowsServices: [], tomcatService: null };
        } else {
            throw error;
        }
    }*/
        try {
          // Fetch Contentverse services
          const contentverseCmd = `Get-Service | Where-Object { $_.Name -like 'Contentverse*' } | Select-Object Name, DisplayName | ConvertTo-Json -Compress`;
          const contentverseJson = await runPowerShellCommand(contentverseCmd);
          let windowsServices = [];
          try { windowsServices = JSON.parse(contentverseJson); } catch { windowsServices = []; }
          if (!Array.isArray(windowsServices)) windowsServices = [windowsServices].filter(Boolean);

          // Split Windows services into web and core groups
          const coreKeywords = ['API','Indexer','Notification','Retention','Sentinel','Storage','Text Extraction','Workflow','ContentverseService'];
          const coreServices = [];
          const webServices = [];
          windowsServices.forEach(svc => {
              const name = (svc.DisplayName || svc.Name || '').toLowerCase();
              if (coreKeywords.some(k => name.includes(k.toLowerCase()))) {
                  coreServices.push(svc);
              } else {
                  webServices.push(svc);
              }
          });

          // Fetch Tomcat services
          const tomcatCmd = `Get-Service | Where-Object { $_.Name -like 'Tomcat*' } | Select-Object Name, DisplayName | ConvertTo-Json -Compress`;
          const tomcatJson = await runPowerShellCommand(tomcatCmd);
          let tomcatServices = [];
          try { tomcatServices = JSON.parse(tomcatJson); } catch { tomcatServices = []; }
          if (!Array.isArray(tomcatServices)) tomcatServices = [tomcatServices].filter(Boolean);

          return {
              webServices,
              coreServices,
              tomcatService: tomcatServices
          };
      } catch (error) {
          console.error('Error fetching services:', error);
          return { webServices: [], coreServices: [], tomcatService: [] };
      }
}



module.exports = { getAllServices };
