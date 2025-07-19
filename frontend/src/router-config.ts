import { createBrowserRouter } from 'react-router-dom';

// Router configuration with future flags to suppress warnings
export const routerConfig = {
  future: {
    // Opt into React Router v7 features to suppress warnings
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

// You can use this config when creating your router:
// const router = createBrowserRouter(routes, routerConfig);