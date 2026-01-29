import React, { useState, useRef } from 'react';
import type { Plan } from '../../types';
import { formatUSDC } from '../../utils/formatters';
import { DataAggregator } from '../../services/dataAggregator';
import { Edit2, Power, PowerOff, Upload, X } from 'lucide-react';
import styles from './PlanManagement.module.scss';

interface PlanManagementProps {
  plans: Plan[];
  onRefresh: () => void;
}

const METADATA_API_URL = import.meta.env.VITE_METADATA_API_URL || 'http://localhost:3002';

export const PlanManagement: React.FC<PlanManagementProps> = ({ plans, onRefresh }) => {
  // const { pausePlan, unpausePlan, loading } = useAdmin();
  const loading = false;
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Off-chain form data
  const [offchainData, setOffchainData] = useState({
    name: '',
    description: '',
    features: ['', '', '', ''],
    riskLevel: 'Low',
    color: '#3B82F6',
    image: '',
    enabled: true,
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setShowEditModal(true);
    
    // Load metadata
    if (plan.metadata) {
      setOffchainData({
        name: plan.metadata.name,
        description: plan.metadata.description,
        features: plan.metadata.features.length >= 4 
          ? plan.metadata.features 
          : [...plan.metadata.features, '', '', '', ''].slice(0, 4),
        riskLevel: plan.metadata.riskLevel,
        color: plan.metadata.color,
        image: plan.metadata.image || '',
        enabled: plan.metadata.enabled !== false,
      });
      setImagePreview(plan.metadata.image ? `${METADATA_API_URL}${plan.metadata.image}` : '');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to API
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('planId', editingPlan?.planId.toString() || '');

      const response = await fetch(`${METADATA_API_URL}/api/upload-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setOffchainData(prev => ({ ...prev, image: result.imagePath }));
      } else {
        alert('Failed to upload image: ' + result.error);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!editingPlan) return;

    try {
      const metadata = {
        id: Number(editingPlan.planId),
        name: offchainData.name,
        description: offchainData.description,
        features: offchainData.features.filter(f => f.trim() !== ''),
        riskLevel: offchainData.riskLevel,
        recommended: ['investors'], // Default
        image: offchainData.image,
        color: offchainData.color,
        enabled: offchainData.enabled,
      };

      const response = await fetch(`${METADATA_API_URL}/api/plans/${editingPlan.planId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });

      const result = await response.json();
      if (result.success) {
        alert('Metadata updated successfully!');
        setShowEditModal(false);
        onRefresh();
      } else {
        alert('Failed to update metadata: ' + result.error);
      }
    } catch (error) {
      console.error('Metadata save error:', error);
      alert('Failed to save metadata');
    }
  };

  const handleToggleEnabled = async (plan: Plan) => {
    const newStatus = !plan.metadata?.enabled;
    
    try {
      // Update metadata
      const metadata = {
        ...plan.metadata,
        id: Number(plan.planId),
        enabled: newStatus,
      };

      const response = await fetch(`${METADATA_API_URL}/api/plans/${plan.planId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });

      if (response.ok) {
        alert(`Plan ${newStatus ? 'enabled' : 'disabled'} successfully!`);
        onRefresh();
      }
    } catch (error) {
      console.error('Toggle error:', error);
      alert('Failed to toggle plan status');
    }
  };

  return (
    <div className={styles.planManagement}>
      <div className={styles.plansGrid}>
        {plans.map((plan) => {
          const days = DataAggregator.tenorSecondsToDays(Number(plan.tenorSeconds));
          const apr = Number(plan.aprBps) / 100;
          const isEnabled = plan.metadata?.enabled !== false;

          return (
            <div 
              key={Number(plan.planId)} 
              className={`${styles.planCard} ${!isEnabled ? styles.disabled : ''}`}
            >
              {/* Plan Image */}
              {plan.metadata?.image && (
                <div className={styles.planImage}>
                  <img 
                    src={`${METADATA_API_URL}${plan.metadata.image}`} 
                    alt={plan.metadata.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-plan.png';
                    }}
                  />
                </div>
              )}

              {/* Plan Header */}
              <div className={styles.planHeader}>
                <h3>{plan.metadata?.name || `Plan #${plan.planId}`}</h3>
                <span className={`${styles.badge} ${isEnabled ? styles.active : styles.inactive}`}>
                  {isEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              {/* Plan Stats */}
              <div className={styles.planStats}>
                <div className={styles.stat}>
                  <span className={styles.label}>Duration</span>
                  <span className={styles.value}>{days} days</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.label}>APR</span>
                  <span className={styles.value}>{apr}%</span>
                </div>
              </div>

              <div className={styles.planStats}>
                <div className={styles.stat}>
                  <span className={styles.label}>Min Deposit</span>
                  <span className={styles.value}>{formatUSDC(plan.minDeposit)} USDC</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.label}>Max Deposit</span>
                  <span className={styles.value}>
                    {plan.maxDeposit === 0n ? 'Unlimited' : `${formatUSDC(plan.maxDeposit)} USDC`}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.planActions}>
                <button
                  className={styles.editBtn}
                  onClick={() => handleEditPlan(plan)}
                  disabled={loading}
                >
                  <Edit2 size={16} />
                  Edit Metadata
                </button>
                
                <button
                  className={`${styles.toggleBtn} ${isEnabled ? styles.disable : styles.enable}`}
                  onClick={() => handleToggleEnabled(plan)}
                  disabled={loading}
                >
                  {isEnabled ? <PowerOff size={16} /> : <Power size={16} />}
                  {isEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingPlan && (
        <div className={styles.modal} onClick={() => setShowEditModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit Plan Metadata</h2>
              <button className={styles.closeBtn} onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* On-chain data (read-only) */}
              <div className={styles.onchainSection}>
                <h3>On-chain Data (Immutable)</h3>
                <div className={styles.readOnlyGrid}>
                  <div>
                    <label>Plan ID</label>
                    <input type="text" value={editingPlan.planId.toString()} disabled />
                  </div>
                  <div>
                    <label>Duration</label>
                    <input 
                      type="text" 
                      value={`${DataAggregator.tenorSecondsToDays(Number(editingPlan.tenorSeconds))} days`} 
                      disabled 
                    />
                  </div>
                  <div>
                    <label>APR</label>
                    <input type="text" value={`${Number(editingPlan.aprBps) / 100}%`} disabled />
                  </div>
                  <div>
                    <label>Min Deposit</label>
                    <input type="text" value={`${formatUSDC(editingPlan.minDeposit)} USDC`} disabled />
                  </div>
                </div>
              </div>

              {/* Off-chain data (editable) */}
              <div className={styles.offchainSection}>
                <h3>Off-chain Metadata (Editable)</h3>
                
                {/* Image Upload */}
                <div className={styles.formGroup}>
                  <label>Plan Image</label>
                  <div className={styles.imageUpload}>
                    {imagePreview && (
                      <div className={styles.imagePreview}>
                        <img src={imagePreview} alt="Preview" />
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      <Upload size={16} />
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div className={styles.formGroup}>
                  <label>Plan Name</label>
                  <input
                    type="text"
                    value={offchainData.name}
                    onChange={(e) => setOffchainData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Flexible Saver (7d)"
                  />
                </div>

                {/* Description */}
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={offchainData.description}
                    onChange={(e) => setOffchainData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Short-term, high-liquidity savings plan"
                    rows={3}
                  />
                </div>

                {/* Features */}
                <div className={styles.formGroup}>
                  <label>Features (up to 4)</label>
                  {offchainData.features.map((feature, index) => (
                    <input
                      key={index}
                      type="text"
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...offchainData.features];
                        newFeatures[index] = e.target.value;
                        setOffchainData(prev => ({ ...prev, features: newFeatures }));
                      }}
                      placeholder={`Feature ${index + 1}`}
                      className={styles.featureInput}
                    />
                  ))}
                </div>

                {/* Risk Level & Color */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Risk Level</label>
                    <select
                      value={offchainData.riskLevel}
                      onChange={(e) => setOffchainData(prev => ({ ...prev, riskLevel: e.target.value }))}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Color</label>
                    <input
                      type="color"
                      value={offchainData.color}
                      onChange={(e) => setOffchainData(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Enabled Toggle */}
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={offchainData.enabled}
                      onChange={(e) => setOffchainData(prev => ({ ...prev, enabled: e.target.checked }))}
                    />
                    <span>Plan Enabled (visible to users)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleSaveMetadata}>
                Save Metadata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
