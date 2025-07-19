import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  IconButton,
  Slider,
  TextField,
  Paper,
  Divider,
  Tooltip
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { EntityType } from '@shared/types';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Field {
  field_id: string;
  field_name: string;
  entity: string;
  type: string;
}

interface FieldsConfigPanelProps {
  entityType: EntityType;
  fields: string[];
  fieldWidths: Record<string, number>;
  onFieldsChange: (fields: string[], fieldWidths: Record<string, number>) => void;
}

const FieldsConfigPanel: React.FC<FieldsConfigPanelProps> = ({
  entityType,
  fields,
  fieldWidths,
  onFieldsChange
}) => {
  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>(fields);
  const [widths, setWidths] = useState<Record<string, number>>(fieldWidths);

  // Fetch available fields for the entity type
  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['fields', entityType],
    queryFn: async () => {
      const response = await axios.get(`/api/fields?entity=${entityType}`);
      return response.data.data as Field[];
    }
  });

  // Update available fields when data is loaded
  useEffect(() => {
    if (fieldsData) {
      setAvailableFields(fieldsData);
    }
  }, [fieldsData]);

  // Update selected fields when props change
  useEffect(() => {
    setSelectedFields(fields);
    setWidths(fieldWidths);
  }, [fields, fieldWidths]);

  // Handle field selection toggle
  const handleFieldToggle = (fieldId: string) => {
    const currentIndex = selectedFields.indexOf(fieldId);
    const newSelectedFields = [...selectedFields];

    if (currentIndex === -1) {
      // Add field
      newSelectedFields.push(fieldId);
      
      // Set default width if not already set
      if (!widths[fieldId]) {
        setWidths({
          ...widths,
          [fieldId]: 150 // Default width
        });
      }
    } else {
      // Remove field
      newSelectedFields.splice(currentIndex, 1);
    }

    setSelectedFields(newSelectedFields);
    onFieldsChange(newSelectedFields, widths);
  };

  // Handle field width change
  const handleWidthChange = (fieldId: string, newWidth: number) => {
    const updatedWidths = {
      ...widths,
      [fieldId]: newWidth
    };
    setWidths(updatedWidths);
    onFieldsChange(selectedFields, updatedWidths);
  };

  // Handle field reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(selectedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedFields(items);
    onFieldsChange(items, widths);
  };

  if (isLoading) {
    return <Typography>Loading fields...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Fields
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Select fields to display, drag to reorder, and adjust column widths.
      </Typography>

      <Box display="flex" gap={2}>
        {/* Available Fields */}
        <Paper elevation={1} sx={{ flex: 1, p: 2, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle1" gutterBottom>
            Available Fields
          </Typography>
          <List dense>
            {availableFields.map((field) => (
              <ListItem key={field.field_id} disablePadding>
                <ListItemText 
                  primary={field.field_name} 
                  secondary={field.type} 
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    edge="end"
                    onChange={() => handleFieldToggle(field.field_id)}
                    checked={selectedFields.indexOf(field.field_id) !== -1}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Selected Fields */}
        <Paper elevation={1} sx={{ flex: 1, p: 2, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Fields
          </Typography>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="selected-fields">
              {(provided) => (
                <List
                  dense
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {selectedFields.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="No fields selected" />
                    </ListItem>
                  ) : (
                    selectedFields.map((fieldId, index) => {
                      const field = availableFields.find(f => f.field_id === fieldId);
                      return (
                        <Draggable key={fieldId} draggableId={fieldId} index={index}>
                          {(provided) => (
                            <ListItem
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <DragIndicatorIcon sx={{ mr: 1, color: 'text.secondary' }} />
                              <ListItemText
                                primary={field?.field_name || fieldId}
                                secondary={`Width: ${widths[fieldId] || 150}px`}
                              />
                              <Box width={120} mr={2}>
                                <Slider
                                  value={widths[fieldId] || 150}
                                  min={50}
                                  max={500}
                                  step={10}
                                  onChange={(_, value) => handleWidthChange(fieldId, value as number)}
                                  aria-labelledby={`width-slider-${fieldId}`}
                                />
                              </Box>
                              <IconButton 
                                edge="end" 
                                onClick={() => handleFieldToggle(fieldId)}
                                size="small"
                              >
                                <VisibilityOffIcon fontSize="small" />
                              </IconButton>
                            </ListItem>
                          )}
                        </Draggable>
                      );
                    })
                  )}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        </Paper>
      </Box>
    </Box>
  );
};

export default FieldsConfigPanel;