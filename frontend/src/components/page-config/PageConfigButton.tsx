import React, { useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { EntityType } from '@shared/types';
import PageConfigDialog from './PageConfigDialog';

interface PageConfigButtonProps {
  entityType: EntityType;
  userId: string;
  currentPageId?: string;
  variant?: 'icon' | 'button';
  label?: string;
}

const PageConfigButton: React.FC<PageConfigButtonProps> = ({
  entityType,
  userId,
  currentPageId,
  variant = 'icon',
  label = 'Configure Page'
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <>
      {variant === 'icon' ? (
        <Tooltip title={label}>
          <IconButton onClick={handleOpenDialog} size="small">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          startIcon={<SettingsIcon />}
          onClick={handleOpenDialog}
          size="small"
          variant="outlined"
        >
          {label}
        </Button>
      )}

      <PageConfigDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        entityType={entityType}
        userId={userId}
        initialPageId={currentPageId}
      />
    </>
  );
};

export default PageConfigButton;