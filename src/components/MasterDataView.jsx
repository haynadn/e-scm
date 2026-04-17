import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { UploadCloud, Database, Trash2, ArrowLeft, DownloadCloud } from 'lucide-react';

export default function MasterDataView({ masterItems, locations, onImport, onClear, onBack, role }) {
  const [importStatus, setImportStatus] = useState('');

  const handleDownloadTemplate = () => {
    try {
      // Create dummy sheet for Lokasi
      const wsLocData = [
        { 'ID Lokasi': 'L-001', 'Nama Lokasi': 'Kalimantan 001', 'Alamat': 'Jl. Contoh Alamat no 1' },
        { 'ID Lokasi': 'L-002', 'Nama Lokasi': 'Kalimantan 002', 'Alamat': 'Jl. Contoh Alamat no 2' }
      ];
      const wsLoc = XLSX.utils.json_to_sheet(wsLocData);

      // Create dummy sheet for Master Item
      const wsItemData = [
        { 'ID Item': 'WT-001', 'Nama Item': 'Work Table w/ Undershelf-WT-1500x700x850+100', 'Quantity Standar': 2, 'Satuan': 'Unit' },
        { 'ID Item': 'VTR-002', 'Nama Item': 'Vegetable Trolley-VTR-1300x850x850', 'Quantity Standar': 1, 'Satuan': 'Unit' }
      ];
      const wsItem = XLSX.utils.json_to_sheet(wsItemData);

      // Build workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsLoc, "Lokasi");
      XLSX.utils.book_append_sheet(wb, wsItem, "Master Item");

      // Write workbook to array buffer and save as Excel file
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, 'Template_Import_Checklist.xlsx');
      
      setImportStatus('✅ Template downloaded successfully!');
    } catch (err) {
      console.error('Download template error:', err);
      setImportStatus('❌ Error downloading template: ' + err.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus('Reading file...');
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Logic to extract Items
        const itemSheetName = wb.SheetNames.find(name => name.toLowerCase().includes('item')) || wb.SheetNames[1];
        let newItems = [];
        if (itemSheetName) {
          const wsItems = wb.Sheets[itemSheetName];
          const rawItems = XLSX.utils.sheet_to_json(wsItems);
          
          newItems = rawItems.map(row => ({
            id: row['ID Item'] || row['id'],
            name: row['Nama Item'] || row['name'],
            standardQty: row['Quantity Standar'] || row['qty'] || 1,
            satuan: row['Satuan'] || row['satuan'] || 'Unit'
          })).filter(item => item.id); // Valid IDs only
        }

        // Logic to extract Locations
        const locSheetName = wb.SheetNames.find(name => name.toLowerCase().includes('lokasi')) || wb.SheetNames[0];
        let newLocs = [];
        if (locSheetName) {
          const wsLocs = wb.Sheets[locSheetName];
          const rawLocs = XLSX.utils.sheet_to_json(wsLocs);
          
          newLocs = rawLocs.map(row => ({
            id: row['ID Lokasi'] || row['id'],
            name: row['Nama Lokasi'] || row['name'],
            address: row['Alamat'] || row['alamat'] || '-',
            status: row['Status Titik'] || 'Pending'
          })).filter(loc => loc.id);
        }

        if (newItems.length > 0 || newLocs.length > 0) {
          onImport(newLocs, newItems);
          setImportStatus(`Successfully imported ${newLocs.length} Locations and ${newItems.length} Items!`);
        } else {
          setImportStatus('No matching headers found in the Excel file.');
        }

      } catch (err) {
        console.error(err);
        setImportStatus('Failed to read Excel file. Ensure headers are correct.');
      }
    };
    
    reader.readAsBinaryString(file);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <h2><Database className="mr-2" style={{ verticalAlign: 'middle' }}/> Master Data Management</h2>
        <button className="btn btn-outline" onClick={onBack}><ArrowLeft size={18} className="mr-2"/> Back</button>
      </div>

      <div className="card mb-4">
        <h3 className="mb-4">Import Data via Excel</h3>
        <p className="text-muted mb-4">
          Upload an `.xlsx` file containing two sheets: <strong>Lokasi</strong> and <strong>Master Item</strong>. 
          Use the template below to ensure your headers match correctly.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <button className="btn btn-primary" onClick={handleDownloadTemplate}>
            <DownloadCloud size={18} /> Download Excel Template
          </button>
          
          {role === 'administrator' && (
            <button className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={onClear}>
              <Trash2 size={18} /> Clear All Data
            </button>
          )}
        </div>

        <div className="upload-zone" style={{ padding: '2rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
            <UploadCloud size={32} color="var(--primary)" className="mb-4" />
            <span style={{ fontWeight: 600 }}>Click to Select Excel File to Import</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
        
        {importStatus && (
          <div className="mt-4" style={{ padding: '1rem', backgroundColor: '#e0e7ff', color: 'var(--primary)', borderRadius: '8px', fontWeight: 500 }}>
            {importStatus}
          </div>
        )}
      </div>

      <div className="grid-stats">
        <div className="card">
          <div className="flex-between mb-4">
            <h3>Registered Locations ({locations.length})</h3>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {locations.length > 0 ? (
               locations.map(loc => (
                 <div key={loc.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                   <strong>{loc.id}</strong> - {loc.name}
                 </div>
               ))
            ) : <p className="text-muted">No locations stored.</p>}
          </div>
        </div>

        <div className="card">
          <div className="flex-between mb-4">
            <h3>Master Items ({masterItems.length})</h3>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {masterItems.length > 0 ? (
               masterItems.map(item => (
                 <div key={item.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                   <strong>{item.id}</strong> - {item.name} <span className="text-muted">({item.standardQty} {item.satuan})</span>
                 </div>
               ))
            ) : <p className="text-muted">No items stored.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
