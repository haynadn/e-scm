import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import LocationList from './components/LocationList';
import ChecklistForm from './components/ChecklistForm';
import MasterDataView from './components/MasterDataView';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
import { useChecklist } from './hooks/useChecklist';
import { Database, LogOut, ShieldCheck, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
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

  if (!session.token) {
    return <Login onLoginSuccess={loginSuccess} />;
  }

  if (!isLoaded) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}><h2>Connecting to Cloud Database...</h2></div>;
  }

  const navigateTo = (view, loc = null) => {
    setCurrentView(view);
    if (loc) {
      setSelectedLocation(loc);
    } else if (view !== 'checklist') {
      setSelectedLocation(null);
    }
  };

  const handleExportReport = () => {
    const reportData = [];
    locations.forEach(loc => {
      if (loc.isCompleted && checklists[loc.id]) {
        checklists[loc.id].forEach(chkItem => {
          const master = masterItems.find(m => m.id === chkItem.idItem);
          reportData.push({
            'ID Checklist': `${loc.id}-${chkItem.idItem}`,
            'ID Lokasi': loc.id,
            'ID Item': chkItem.idItem,
            'Nama Item': master ? master.name : '-',
            'Jumlah Seharusnya': master ? master.standardQty : '-',
            'Jumlah Aktual': Number(chkItem.jumlahAktual),
            'Kondisi Item': chkItem.kondisi,
            'Terdapat Dokumentasi': chkItem.dokumentasi && chkItem.dokumentasi.startsWith('http') ? 'Ya' : 'Tidak',
            'Catatan': chkItem.catatan
          });
        });
      }
    });

    if (reportData.length === 0) {
      alert("Belum ada data checklist yang diisi. Isi minimal satu lokasi untuk diekspor!");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Checklist Laporan");

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Laporan_Checklist_Akomodasi_Online.xlsx');
  };

  return (
    <div className="app-container">
      <header className="header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h1>Sigma CMO - Checklist Manager Online</h1>
          <p>Logged in as: <strong>{session.username}</strong> ({session.role})</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {session.role === 'admin' && (
            <>
              <button className="btn" style={{ backgroundColor: 'white', color: 'var(--primary)', padding: '0.5rem 1rem' }} onClick={() => navigateTo('master')}>
                <Database size={18} /> Master Data
              </button>
              <button className="btn" style={{ backgroundColor: 'white', color: 'var(--primary)', padding: '0.5rem 1rem' }} onClick={() => navigateTo('users')}>
                <Users size={18} /> User Management
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

        {currentView === 'master' && session.role === 'admin' && (
          <MasterDataView 
            masterItems={masterItems}
            locations={locations}
            onImport={importMasterData}
            onClear={clearAllData}
            onBack={() => navigateTo('dashboard')}
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

        {currentView === 'users' && session.role === 'admin' && (
          <UserManagement 
            token={session.token}
            onBack={() => navigateTo('dashboard')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
