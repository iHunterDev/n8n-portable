@echo off 
echo Creating backup of n8n data... 
set BACKUP_DIR=backup\n8n-backup-%9/20%%5/%%20%-%22%%12% 
set BACKUP_DIR=%%BACKUP_DIR: =0%% 
 
if not exist "backup" mkdir backup 
mkdir "%%BACKUP_DIR%%" 
 
echo Backing up data directory... 
xcopy /E /I /H data "%%BACKUP_DIR%%\data\" 
 
echo Backing up configuration... 
xcopy /E /I config "%%BACKUP_DIR%%\config\" 
 
echo Backup completed: %%BACKUP_DIR%% 
pause 
