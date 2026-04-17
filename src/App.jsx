import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import LocationList from './components/LocationList';
import ChecklistForm from './components/ChecklistForm';
import MasterDataView from './components/MasterDataView';
import UserManagement from './components/UserManagement';
import ActivityLogsView from './components/ActivityLogsView';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
import { useChecklist } from './hooks/useChecklist';
import { Database, LogOut, ShieldCheck, Users, MapPin, History } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './index.css';

function App() {
  const { 
    isLoaded, session, loginSuccess, performLogout, 
    locations, masterItems, checklists, saveChecklist, getStats, importMasterData, clearAllData, updateLocationName 
  } = useChecklist();
  
  // view: 'dashboard' | 'locations' | 'checklist' | 'master' | 'users'
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!session.token) {
    return <Login onLoginSuccess={loginSuccess} />;
  }

  if (!isLoaded) {
    return <div className="loading-container"><h2>Connecting to Cloud Database...</h2></div>;
  }

  if (isExporting) {
    return <div className="loading-container"><h2>Generating Excel Report...</h2><p>This may take a few seconds if you have many photos.</p></div>;
  }

  const navigateTo = (view, loc = null) => {
    setCurrentView(view);
    if (loc) {
      setSelectedLocation(loc);
    } else if (view !== 'checklist') {
      setSelectedLocation(null);
    }
  };

  const fetchImageAsBuffer = async (url) => {
    try {
      // Protocol Upgrade: if page is HTTPS, force HTTPS for the fetch URL
      let fetchUrl = url;
      if (window.location.protocol === 'https:' && url.startsWith('http:')) {
        fetchUrl = url.replace('http:', 'https:');
      }
      
      console.log(`Fetching image: ${fetchUrl}`);
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const mimeType = response.headers.get('Content-Type') || 'image/jpeg';
      let ext = mimeType.split('/')[1] || 'jpeg';
      if (ext === 'jpg') ext = 'jpeg';
      
      console.log(`Image fetched successfully. Type: ${ext}, Size: ${arrayBuffer.byteLength} bytes`);
      return { buffer: new Uint8Array(arrayBuffer), ext };
    } catch (err) {
      console.error('Failed to fetch image:', err);
      return null;
    }
  };

  const handleExportReport = async () => {
    try {
      // Preparations
      setIsExporting(true); // Show loading indicator
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Checklist Laporan');

      // Headers
      worksheet.columns = [
        { header: 'ID Checklist', key: 'idChecklist', width: 20 },
        { header: 'ID Lokasi', key: 'idLokasi', width: 15 },
        { header: 'ID Item', key: 'idItem', width: 15 },
        { header: 'Nama Item', key: 'namaItem', width: 30 },
        { header: 'Jumlah Seharusnya', key: 'qtyStd', width: 15 },
        { header: 'Jumlah Aktual', key: 'qtyAktual', width: 15 },
        { header: 'Kondisi Item', key: 'kondisi', width: 15 },
        { header: 'Catatan', key: 'catatan', width: 30 },
        { header: 'Foto Dokumentasi', key: 'foto', width: 30 }
      ];

      // Styling Headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      let currentRowNumber = 2;
      let dataFound = false;

      for (const loc of locations) {
        if (loc.isCompleted && checklists[loc.id]) {
          dataFound = true;
          for (const chkItem of checklists[loc.id]) {
            const master = masterItems.find(m => m.id === chkItem.idItem);
            const rowData = {
              idChecklist: `${loc.id}-${chkItem.idItem}`,
              idLokasi: loc.id,
              idItem: chkItem.idItem,
              namaItem: master ? master.name : '-',
              qtyStd: master ? master.standardQty : '-',
              qtyAktual: Number(chkItem.jumlahAktual),
              kondisi: chkItem.kondisi,
              catatan: chkItem.catatan || ''
            };

            const row = worksheet.addRow(rowData);
            row.height = 100; // Large row for image
            row.alignment = { vertical: 'middle' };

            // Handle Image
            if (chkItem.dokumentasi && chkItem.dokumentasi.startsWith('http')) {
              try {
                const imgData = await fetchImageAsBuffer(chkItem.dokumentasi);
                if (imgData && imgData.buffer) {
                  const imageId = workbook.addImage({
                    buffer: imgData.buffer,
                    extension: imgData.ext,
                  });
                  worksheet.addImage(imageId, {
                    tl: { col: 8, row: row.number - 1 },
                    ext: { width: 120, height: 120 },
                    editAs: 'oneCell'
                  });
                }
              } catch (imgErr) {
                console.warn(`Failed to embed image for ${chkItem.idItem}:`, imgErr);
              }
            }
            
            currentRowNumber++;
          }
        }
      }

      if (!dataFound) {
        setIsExporting(false);
        alert("Belum ada data checklist yang diisi. Isi minimal satu lokasi untuk diekspor!");
        return;
      }

      console.log('Generating Excel buffer...');
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Laporan_Checklist_SigmaCMO_KrakatauSteel.xlsx');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Gagal mengekspor data: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
        <div style={{ width: '100%' }}>
          <h1>Sigma CMO - Checklist Manager Online</h1>
          <p>Logged in as: <strong>{session.username}</strong> ({session.role})</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          {session.role === 'administrator' && (
            <>
              <button className="btn" style={{ backgroundColor: 'white', color: 'var(--primary)', padding: '0.5rem 1rem' }} onClick={() => navigateTo('master')}>
                <Database size={18} /> Master Data
              </button>
              <button className="btn" style={{ backgroundColor: 'white', color: 'var(--primary)', padding: '0.5rem 1rem' }} onClick={() => navigateTo('users')}>
                <Users size={18} /> User Management
              </button>
              <button className="btn" style={{ backgroundColor: 'white', color: 'var(--primary)', padding: '0.5rem 1rem' }} onClick={() => navigateTo('logs')}>
                <History size={18} /> Logs
              </button>
            </>
          )}
          <button className="btn" style={{ backgroundColor: 'white', color: 'var(--primary)', padding: '0.5rem 1rem' }} onClick={() => setIsPasswordModalOpen(true)}>
            <ShieldCheck size={18} /> Password
          </button>
          <button className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem 1rem' }} onClick={performLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        token={session.token} 
      />

      <main>
        {currentView === 'dashboard' && (
          <Dashboard 
            stats={getStats()} 
            onNavigate={navigateTo} 
            onExport={handleExportReport}
            locations={locations}
            checklists={checklists}
            masterItems={masterItems}
            role={session.role}
          />
        )}

        {currentView === 'master' && session.role === 'administrator' && (
          <MasterDataView 
            masterItems={masterItems}
            locations={locations}
            onImport={importMasterData}
            onClear={clearAllData}
            onBack={() => navigateTo('dashboard')}
            role={session.role}
          />
        )}
        
        {currentView === 'locations' && (
          <LocationList 
            locations={locations} 
            checklists={checklists}
            masterItems={masterItems}
            onSelectLocation={(loc) => navigateTo('checklist', loc)}
            onBack={() => navigateTo('dashboard')}
            onUpdateLocationName={updateLocationName}
            role={session.role}
          />
        )}
        
        {currentView === 'checklist' && selectedLocation && (
          <ChecklistForm 
            location={selectedLocation}
            masterItems={masterItems}
            savedData={checklists[selectedLocation.id]}
            onSave={saveChecklist}
            onBack={() => navigateTo('locations')}
            role={session.role}
          />
        )}

        {currentView === 'users' && session.role === 'administrator' && (
          <UserManagement 
            token={session.token}
            role={session.role}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {currentView === 'logs' && session.role === 'administrator' && (
          <ActivityLogsView 
            token={session.token}
            onBack={() => navigateTo('dashboard')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
