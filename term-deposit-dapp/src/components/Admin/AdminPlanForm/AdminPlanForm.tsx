import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, Trash2 } from 'lucide-react';
import type { Plan } from '../../../types';
import styles from './AdminPlanForm.module.css';

interface AdminPlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (planData: PlanFormData) => Promise<void>;
  editingPlan?: Plan | null;
}

export interface PlanFormData {
  // On-chain fields
  tenorDays: number;
  aprBps: number;
  minDeposit: number;
  maxDeposit: number;
  earlyWithdrawPenaltyBps: number;
  
  // Off-chain fields
  name: string;
  description: string;
  features: string[];
  riskLevel: string;
  recommended: string[];
  image: string;
  color: string;
  enabled: boolean;
}

const RISK_LEVELS = ['Low', 'Medium', 'High'];

export const AdminPlanForm: React.FC<AdminPlanFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingPlan
}) => {
  const [formData, setFormData] = useState<PlanFormData>({
    tenorDays: 30,
    aprBps: 500,
    minDeposit: 100,
    maxDeposit: 10000,
    earlyWithdrawPenaltyBps: 300,
    name: '',
    description: '',
    features: [''],
    riskLevel: 'Low',
    recommended: [''],
    image: '',
    color: '#3B82F6',
    enabled: true
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingPlan) {
      const metadata = editingPlan.metadata;
      const tenorSeconds = Number(editingPlan.tenorSeconds);
      const tenorDays = tenorSeconds / 86400;
      
      console.log('📝 [AdminPlanForm] Editing plan:', {
        planId: editingPlan.planId.toString(),
        tenorSeconds,
        tenorDays,
        hours: tenorDays * 24,
        minutes: tenorDays * 24 * 60,
        imagePath: metadata?.image
      });
      
      setFormData({
        tenorDays,
        aprBps: Number(editingPlan.aprBps),
        minDeposit: Number(editingPlan.minDeposit) / 1e6,
        maxDeposit: Number(editingPlan.maxDeposit) / 1e6,
        earlyWithdrawPenaltyBps: Number(editingPlan.earlyWithdrawPenaltyBps),
        name: metadata?.name || '',
        description: metadata?.description || '',
        features: metadata?.features || [''],
        riskLevel: metadata?.riskLevel || 'Low',
        recommended: metadata?.recommended || [''],
        image: metadata?.image || '',
        color: metadata?.color || '#3B82F6',
        enabled: metadata?.enabled ?? true
      });
      
      // Set image preview with full URL
      if (metadata?.image) {
        const apiUrl = import.meta.env.VITE_METADATA_API_URL || 'http://localhost:3002';
        setImagePreview(`${apiUrl}${metadata.image}`);
      } else {
        setImagePreview('');
      }
    }
  }, [editingPlan]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    
    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return formData.image;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', imageFile);

      const apiUrl = import.meta.env.VITE_METADATA_API_URL || 'http://localhost:3002';
      const planId = editingPlan?.planId.toString() || 'new';
      const response = await fetch(`${apiUrl}/api/upload-image?planId=${planId}`, {
        method: 'POST',
        body: formDataUpload
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response:', errorText);
        throw new Error(`Image upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Image uploaded successfully:', result);
      return result.imagePath;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Upload image if new file selected
      let imagePath = formData.image;
      if (imageFile) {
        try {
          imagePath = await uploadImage();
        } catch (uploadError) {
          console.error('Image upload failed, continuing without image:', uploadError);
          // Continue without image if upload fails
          imagePath = '';
        }
      }

      await onSubmit({
        ...formData,
        image: imagePath
      });

      onClose();
    } catch (error) {
      console.error('Form submit error:', error);
      alert('Failed to submit plan: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const addFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
  };

  const addRecommended = () => {
    setFormData(prev => ({ ...prev, recommended: [...prev.recommended, ''] }));
  };

  const removeRecommended = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recommended: prev.recommended.filter((_, i) => i !== index)
    }));
  };

  const updateRecommended = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      recommended: prev.recommended.map((r, i) => i === index ? value : r)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* On-chain Fields */}
          <div className={styles.section}>
            <h3>On-chain Data (Blockchain)</h3>
            
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Tenor Period (Days)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.tenorDays}
                  onChange={(e) => setFormData({ ...formData, tenorDays: Number(e.target.value) })}
                  required
                  min="0.001"
                />
                <span className={styles.hint}>
                  {formData.tenorDays >= 1 
                    ? `${Math.floor(formData.tenorDays)} days` 
                    : formData.tenorDays >= 1/24 
                    ? `${Math.floor(formData.tenorDays * 24)} hours`
                    : formData.tenorDays >= 1/(24*60)
                    ? `${Math.floor(formData.tenorDays * 24 * 60)} minutes`
                    : `${Math.floor(formData.tenorDays * 24 * 60 * 60)} seconds`
                  }
                  {' | '}
                  {Math.floor(formData.tenorDays * 24 * 60 * 60)} seconds
                </span>
              </div>

              <div className={styles.field}>
                <label>APR (Basis Points)</label>
                <input
                  type="number"
                  value={formData.aprBps}
                  onChange={(e) => setFormData({ ...formData, aprBps: Number(e.target.value) })}
                  required
                  min="1"
                />
                <span className={styles.hint}>{(formData.aprBps / 100).toFixed(2)}%</span>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Min Deposit (USDC)</label>
                <input
                  type="number"
                  value={formData.minDeposit}
                  onChange={(e) => setFormData({ ...formData, minDeposit: Number(e.target.value) })}
                  required
                  min="0"
                />
              </div>

              <div className={styles.field}>
                <label>Max Deposit (USDC)</label>
                <input
                  type="number"
                  value={formData.maxDeposit}
                  onChange={(e) => setFormData({ ...formData, maxDeposit: Number(e.target.value) })}
                  required
                  min="0"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Early Withdrawal Penalty (Basis Points)</label>
              <input
                type="number"
                value={formData.earlyWithdrawPenaltyBps}
                onChange={(e) => setFormData({ ...formData, earlyWithdrawPenaltyBps: Number(e.target.value) })}
                required
                min="0"
              />
              <span className={styles.hint}>{(formData.earlyWithdrawPenaltyBps / 100).toFixed(2)}%</span>
            </div>
          </div>

          {/* Off-chain Fields */}
          <div className={styles.section}>
            <h3>Off-chain Metadata (JSON)</h3>

            <div className={styles.field}>
              <label>Plan Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Flexible Saver (30d)"
              />
            </div>

            <div className={styles.field}>
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="Short description of the plan"
                rows={3}
              />
            </div>

            <div className={styles.field}>
              <label>Plan Image</label>
              <div className={styles.imageUpload}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  id="image-upload"
                  className={styles.fileInput}
                />
                <label htmlFor="image-upload" className={styles.uploadButton}>
                  <Upload size={20} />
                  <span>Choose Image</span>
                </label>
                {imagePreview && (
                  <div className={styles.imagePreview}>
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Risk Level</label>
                <select
                  value={formData.riskLevel}
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                >
                  {RISK_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>Color</label>
                <div className={styles.colorPicker}>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <span>{formData.color}</span>
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label>Features</label>
              {formData.features.map((feature, index) => (
                <div key={index} className={styles.arrayItem}>
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="Feature description"
                  />
                  {formData.features.length > 1 && (
                    <button type="button" onClick={() => removeFeature(index)} className={styles.removeButton}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addFeature} className={styles.addButton}>
                <Plus size={16} /> Add Feature
              </button>
            </div>

            <div className={styles.field}>
              <label>Recommended For</label>
              {formData.recommended.map((rec, index) => (
                <div key={index} className={styles.arrayItem}>
                  <input
                    type="text"
                    value={rec}
                    onChange={(e) => updateRecommended(index, e.target.value)}
                    placeholder="e.g., beginners"
                  />
                  {formData.recommended.length > 1 && (
                    <button type="button" onClick={() => removeRecommended(index)} className={styles.removeButton}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addRecommended} className={styles.addButton}>
                <Plus size={16} /> Add Category
              </button>
            </div>

            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                <span>Enable this plan (users can select it)</span>
              </label>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={submitting || uploading}>
              {submitting ? 'Saving...' : uploading ? 'Uploading Image...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
