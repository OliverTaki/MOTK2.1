import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Card,
  CardContent,
  Divider,
  Alert,
} from '@mui/material';
import { ProjectSetupData } from './ProjectSetupWizard';

interface StorageProviderStepProps {
  data: Partial<ProjectSetupData>;
  onChange: (data: Partial<ProjectSetupData>) => void;
  onError: (error: string) => void;
}

export const StorageProviderStep: React.FC<StorageProviderStepProps> = ({
  data,
  onChange,
  onError
}) => {
  const [storageProvider, setStorageProvider] = useState<'gdrive' | 'box'>(
    data.storage_provider || 'gdrive'
  );
  const [originalsRootUrl, setOriginalsRootUrl] = useState(data.originals_root_url || '');
  const [proxiesRootUrl, setProxiesRootUrl] = useState(data.proxies_root_url || '');
  const [originalsError, setOriginalsError] = useState('');
  const [proxiesError, setProxiesError] = useState('');

  useEffect(() => {
    // Clear any previous errors when component mounts
    onError('');
  }, [onError]);

  const validateUrl = (url: string, fieldName: string): boolean => {
    if (!url.trim()) {
      return false;
    }

    // Basic URL validation
    try {
      new URL(url);
      return true;
    } catch {
      // If URL constructor fails, check if it's a valid path format
      if (storageProvider === 'gdrive') {
        // Google Drive URLs should contain drive.google.com or be a folder ID
        const driveUrlRegex = /^(https:\/\/drive\.google\.com\/|[a-zA-Z0-9_-]+).*$/;
        return driveUrlRegex.test(url);
      } else if (storageProvider === 'box') {
        // Box URLs should contain box.com or be a folder ID
        const boxUrlRegex = /^(https:\/\/.*\.box\.com\/|[a-zA-Z0-9_-]+).*$/;
        return boxUrlRegex.test(url);
      }
      return false;
    }
  };

  const handleStorageProviderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const provider = event.target.value as 'gdrive' | 'box';
    setStorageProvider(provider);
    
    // Clear URLs when switching providers
    setOriginalsRootUrl('');
    setProxiesRootUrl('');
    setOriginalsError('');
    setProxiesError('');
    
    onChange({
      storage_provider: provider,
      originals_root_url: '',
      proxies_root_url: ''
    });
  };

  const handleOriginalsUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setOriginalsRootUrl(value);
    
    const isValid = validateUrl(value, 'Originals Root URL');
    if (!isValid && value.trim()) {
      setOriginalsError('Please enter a valid URL or folder ID');
    } else {
      setOriginalsError('');
    }
    
    onChange({
      storage_provider: storageProvider,
      originals_root_url: value,
      proxies_root_url: proxiesRootUrl
    });
    
    // Update error state
    if (!isValid && value.trim()) {
      onError('Please check your storage URLs');
    } else if (isValid && validateUrl(proxiesRootUrl, 'Proxies Root URL')) {
      onError('');
    }
  };

  const handleProxiesUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setProxiesRootUrl(value);
    
    const isValid = validateUrl(value, 'Proxies Root URL');
    if (!isValid && value.trim()) {
      setProxiesError('Please enter a valid URL or folder ID');
    } else {
      setProxiesError('');
    }
    
    onChange({
      storage_provider: storageProvider,
      originals_root_url: originalsRootUrl,
      proxies_root_url: value
    });
    
    // Update error state
    if (!isValid && value.trim()) {
      onError('Please check your storage URLs');
    } else if (isValid && validateUrl(originalsRootUrl, 'Originals Root URL')) {
      onError('');
    }
  };

  const getProviderInstructions = () => {
    if (storageProvider === 'gdrive') {
      return {
        title: 'Google Drive Setup',
        instructions: [
          '1. Create two folders in your Google Drive: one for originals and one for proxies',
          '2. Right-click each folder and select "Get link"',
          '3. Make sure the folders are set to "Anyone with the link can view"',
          '4. Copy the full URLs or just the folder IDs from the URLs'
        ],
        urlExample: 'https://drive.google.com/drive/folders/1ABC123xyz or just 1ABC123xyz'
      };
    } else {
      return {
        title: 'Box Setup',
        instructions: [
          '1. Create two folders in your Box account: one for originals and one for proxies',
          '2. Right-click each folder and select "Share"',
          '3. Set the sharing permissions appropriately for your team',
          '4. Copy the full URLs or folder IDs'
        ],
        urlExample: 'https://company.box.com/folder/123456789 or just 123456789'
      };
    }
  };

  const providerInfo = getProviderInstructions();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Storage Provider Configuration
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose your file storage provider and configure the root folders for originals and proxy files.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <FormControl component="fieldset">
          <Typography variant="subtitle1" gutterBottom>
            Select Storage Provider
          </Typography>
          <RadioGroup
            value={storageProvider}
            onChange={handleStorageProviderChange}
            row
          >
            <FormControlLabel
              value="gdrive"
              control={<Radio />}
              label="Google Drive"
            />
            <FormControlLabel
              value="box"
              control={<Radio />}
              label="Box"
            />
          </RadioGroup>
        </FormControl>

        <Divider />

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              {providerInfo.title}
            </Typography>
            {providerInfo.instructions.map((instruction, index) => (
              <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                {instruction}
              </Typography>
            ))}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Example:</strong> {providerInfo.urlExample}
            </Typography>
          </CardContent>
        </Card>

        <TextField
          fullWidth
          label="Originals Root URL"
          value={originalsRootUrl}
          onChange={handleOriginalsUrlChange}
          error={!!originalsError}
          helperText={originalsError || 'URL or folder ID where original files will be stored'}
          required
          placeholder={storageProvider === 'gdrive' ? 
            'https://drive.google.com/drive/folders/1ABC123xyz' : 
            'https://company.box.com/folder/123456789'
          }
        />

        <TextField
          fullWidth
          label="Proxies Root URL"
          value={proxiesRootUrl}
          onChange={handleProxiesUrlChange}
          error={!!proxiesError}
          helperText={proxiesError || 'URL or folder ID where proxy files will be stored'}
          required
          placeholder={storageProvider === 'gdrive' ? 
            'https://drive.google.com/drive/folders/1DEF456abc' : 
            'https://company.box.com/folder/987654321'
          }
        />

        <Alert severity="info">
          <Typography variant="body2">
            <strong>Important:</strong> Make sure you have appropriate permissions to create folders 
            in the specified locations. The system will create subfolders for each entity (shots, assets, tasks) 
            under these root folders.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};