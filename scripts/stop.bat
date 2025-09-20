@echo off 
echo Stopping n8n... 
taskkill /f /im node.exe 2>nul 
echo n8n stopped. 
pause 
