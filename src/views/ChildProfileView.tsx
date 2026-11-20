import React, { useState } from 'react';
import { User, Plus, Edit2, Shield, Heart, School, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Child } from '../types';

export const ChildProfileView: React.FC = () => {
  const {
    childrenList,
    selectedChildId,
    setSelectedChildId,
    registerChild,
    updateChild,
    currentUser,
  } = useApp();

  const [isRegistering, setIsRegistering] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    age: 8,
    bloodGroup: 'O+',
    guardianName: currentUser?.name || 'Sarah Martinez',
    guardianPhone: currentUser?.phone || '+1 (555) 234-5678',
    emergencyContactAlt: '+1 (555) 987-6543 (Grandmother)',
    schoolName: 'St. Xavier Model Academy',
    deviceId: 'TAG003',
    safeZoneRadiusMeters: 250,
    homeAddressName: '24 Hillside Road, Sector 3',
    homeLat: 9.92520,
    homeLng: 78.11980,
    schoolLat: 9.92810,
    schoolLng: 78.12350,
    notes: 'No known allergies. In emergency, notify mother first.',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Child name is required.';
    if (formData.age < 2 || formData.age > 18) errors.age = 'Age must be between 2 and 18.';
    if (!formData.guardianPhone.trim()) errors.guardianPhone = 'Primary phone is required.';
    if (!formData.deviceId.trim()) errors.deviceId = 'Device ID is required.';
    if (formData.safeZoneRadiusMeters < 50 || formData.safeZoneRadiusMeters > 5000) {
      errors.safeZoneRadiusMeters = 'Radius must be between 50 and 5000 meters.';
    }
    if (isNaN(formData.homeLat) || formData.homeLat < -90 || formData.homeLat > 90) {
      errors.homeLat = 'Valid latitude between -90 and 90 is required.';
    }
    if (isNaN(formData.homeLng) || formData.homeLng < -180 || formData.homeLng > 180) {
      errors.homeLng = 'Valid longitude between -180 and 180 is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFillDemoData = () => {
    setFormData({
      name: 'Rohan Varma',
      age: 9,
      bloodGroup: 'A+',
      guardianName: 'Priya Varma',
      guardianPhone: '+1 (555) 443-2211',
      emergencyContactAlt: '+1 (555) 778-9900 (Father)',
      schoolName: 'Kendriya Vidyalaya North',
      deviceId: `TAG${Math.floor(100 + Math.random() * 900)}`,
      safeZoneRadiusMeters: 220,
      homeAddressName: '88 Rose Avenue, Madurai Central',
      homeLat: 9.92340,
      homeLng: 78.11820,
      schoolLat: 9.92740,
      schoolLng: 78.12210,
      notes: 'Carries EpiPen for peanut allergy in backpack side pocket.',
    });
    setFormErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingChildId) {
      updateChild(editingChildId, formData);
      setSuccessMessage('Child profile updated successfully.');
      setEditingChildId(null);
    } else {
      const newChild = registerChild(formData);
      setSelectedChildId(newChild.id);
      setSuccessMessage(`Child "${newChild.name}" registered successfully with Device ID: ${newChild.deviceId}.`);
      setIsRegistering(false);
    }

    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startEdit = (child: Child) => {
    setEditingChildId(child.id);
    setFormData({
      name: child.name,
      age: child.age,
      bloodGroup: child.bloodGroup,
      guardianName: child.guardianName,
      guardianPhone: child.guardianPhone,
      emergencyContactAlt: child.emergencyContactAlt,
      schoolName: child.schoolName,
      deviceId: child.deviceId,
      safeZoneRadiusMeters: child.safeZoneRadiusMeters,
      homeAddressName: child.homeAddressName,
      homeLat: child.homeLat,
      homeLng: child.homeLng,
      schoolLat: child.schoolLat,
      schoolLng: child.schoolLng,
      notes: child.notes || '',
    });
    setIsRegistering(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#111827]">
            Child Profiles &amp; Device Registry
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage registered children, guardian emergency contacts, device associations, and medical notes.
          </p>
        </div>

        {!isRegistering && (
          <button
            onClick={() => {
              setIsRegistering(true);
              setEditingChildId(null);
            }}
            className="bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Child</span>
          </button>
        )}
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-md flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Registration / Edit Modal Form */}
      {isRegistering ? (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] mb-6">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                {editingChildId ? 'Edit Child Profile' : 'Register New Child for Safety Monitoring'}
              </h3>
              <p className="text-xs text-gray-500">
                All fields validated on client and backend. Safe zone and dynamic QR token generated automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFillDemoData}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded border border-blue-200 cursor-pointer"
              >
                Fill Fictional Demo Data
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setEditingChildId(null);
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Child Identity */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Child Basic Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Child Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
                  />
                  {formErrors.name && <p className="text-[11px] text-red-600 mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
                  />
                  {formErrors.age && <p className="text-[11px] text-red-600 mt-1">{formErrors.age}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Contacts & School */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                Guardian &amp; Emergency Contacts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Primary Guardian Name *
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Guardian Phone (SOS Recipient) *
                  </label>
                  <input
                    type="text"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    placeholder="+1 (555) 234-5678"
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
                  />
                  {formErrors.guardianPhone && <p className="text-[11px] text-red-600 mt-1">{formErrors.guardianPhone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Secondary Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContactAlt}
                    onChange={(e) => setFormData({ ...formData, emergencyContactAlt: e.target.value })}
                    placeholder="+1 (555) 987-6543 (Grandparent)"
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  School Name &amp; Campus
                </label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="e.g. St. Xavier Model Academy"
                  className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Section 3: Hardware Association & Coordinates */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                Hardware Tag Association &amp; Safe Zone
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assigned Device ID *
                  </label>
                  <input
                    type="text"
                    value={formData.deviceId}
                    onChange={(e) => setFormData({ ...formData, deviceId: e.target.value.toUpperCase() })}
                    placeholder="e.g. TAG003"
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] font-mono font-bold focus:outline-none focus:border-blue-500 bg-white"
                  />
                  {formErrors.deviceId && <p className="text-[11px] text-red-600 mt-1">{formErrors.deviceId}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Safe Zone Radius (Meters) *
                  </label>
                  <input
                    type="number"
                    value={formData.safeZoneRadiusMeters}
                    onChange={(e) => setFormData({ ...formData, safeZoneRadiusMeters: parseInt(e.target.value) || 200 })}
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
                  />
                  {formErrors.safeZoneRadiusMeters && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.safeZoneRadiusMeters}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Home Base Latitude *
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={formData.homeLat}
                    onChange={(e) => setFormData({ ...formData, homeLat: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] font-mono focus:outline-none focus:border-blue-500 bg-white"
                  />
                  {formErrors.homeLat && <p className="text-[11px] text-red-600 mt-1">{formErrors.homeLat}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Home Base Longitude *
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={formData.homeLng}
                    onChange={(e) => setFormData({ ...formData, homeLng: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] font-mono focus:outline-none focus:border-blue-500 bg-white"
                  />
                  {formErrors.homeLng && <p className="text-[11px] text-red-600 mt-1">{formErrors.homeLng}</p>}
                </div>
              </div>
            </div>

            {/* Section 4: Medical / Care Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-red-600" />
                Medical, Allergy &amp; Emergency Care Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Important medical notes (allergies, medications, pediatrician contacts) visible only to authorized scanners."
                className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setEditingChildId(null);
                }}
                className="bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold px-4 py-2 rounded-md border border-[#E5E7EB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold px-5 py-2 rounded-md transition-colors cursor-pointer"
              >
                {editingChildId ? 'Save Changes' : 'Register Child & Generate QR Tag'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Children List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {childrenList.map((child) => {
          const isSelected = child.id === selectedChildId;

          return (
            <div
              key={child.id}
              className={`bg-white rounded-lg border p-5 transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-100'
                  : 'border-[#E5E7EB] hover:border-gray-400'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-extrabold text-base">
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">{child.name}</h3>
                    <p className="text-xs text-gray-500">
                      ID: {child.id} • Age: {child.age} • Blood Group: <span className="font-bold text-red-600">{child.bloodGroup}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEdit(child)}
                    className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 cursor-pointer"
                    title="Edit Child Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px]">School:</span>
                  <span className="font-semibold text-gray-900 truncate block">{child.schoolName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Device Hardware Tag:</span>
                  <span className="font-mono font-bold text-blue-700">{child.deviceId}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Primary Guardian:</span>
                  <span className="font-semibold text-gray-900">{child.guardianName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Safe Zone Perimeter:</span>
                  <span className="font-semibold text-emerald-700">{child.safeZoneRadiusMeters} meters</span>
                </div>
              </div>

              <div className="mt-3 bg-[#F3F4F6] rounded p-2 text-xs">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">QR Token Status:</span>
                <div className="flex items-center justify-between font-mono text-[11px] mt-0.5">
                  <span className={child.qrRevoked ? 'text-red-600 line-through' : 'text-gray-800 font-bold'}>
                    {child.qrToken}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    child.qrRevoked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {child.qrRevoked ? 'REVOKED' : 'ACTIVE & SECURE'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                <button
                  onClick={() => setSelectedChildId(child.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#F3F4F6] text-[#111827] hover:bg-gray-200'
                  }`}
                >
                  {isSelected ? 'Currently Selected' : 'Select for Tracking'}
                </button>

                <span className="text-[11px] text-gray-400 font-medium">
                  Created {new Date(child.qrCreatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
