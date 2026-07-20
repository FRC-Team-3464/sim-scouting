import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import MatchForm from "./pages/MatchForm";
import Footer from "./components/Footer";
import LocalStorageView from "./pages/LocalStored";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import PitScoutingForm from "./pages/pitScoutingForm";
import { AuthenticationProvider } from "./auth/AuthenticationProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { FreshSessionRoute } from "./auth/FreshSessionRoute";
import { APP_ROUTES, LEGACY_APP_ROUTES } from "./routes";

function App() {
    return (
        <BrowserRouter>
            <AuthenticationProvider>
                {/* Make flex column for sticky footer */}
                <div className="flex min-h-screen flex-col w-full">
                    {/* Main content grows to fill screen */}
                    <div className="flex grow justify-center mb-10">
                        <Routes>
                            <Route
                                path={APP_ROUTES.login}
                                element={<LoginPage />}
                            />
                            <Route
                                path={APP_ROUTES.signup}
                                element={<SignupPage />}
                            />
                            {/* Preserve old bookmarks while exposing only the
                                lowercase canonical paths in new navigation. */}
                            <Route
                                path={LEGACY_APP_ROUTES.localData}
                                element={
                                    <Navigate
                                        to={APP_ROUTES.localData}
                                        replace
                                    />
                                }
                            />
                            <Route
                                path={LEGACY_APP_ROUTES.pit}
                                element={
                                    <Navigate to={APP_ROUTES.pit} replace />
                                }
                            />
                            <Route element={<ProtectedRoute />}>
                                <Route
                                    path={APP_ROUTES.home}
                                    element={<Home />}
                                />
                                <Route
                                    path={APP_ROUTES.localData}
                                    element={<LocalStorageView />}
                                />
                                <Route element={<FreshSessionRoute />}>
                                    <Route
                                        path={APP_ROUTES.match}
                                        element={<MatchForm />}
                                    />
                                    <Route
                                        path={APP_ROUTES.pit}
                                        element={<PitScoutingForm />}
                                    />
                                </Route>
                            </Route>
                        </Routes>
                    </div>
                    {/* Footer always at bottom */}
                    <Footer />
                </div>
            </AuthenticationProvider>
        </BrowserRouter>
    );
}

export default App;
