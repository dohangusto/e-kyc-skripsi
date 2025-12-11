import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/widgets/primary_button.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class EligibilityPage extends StatefulWidget {
  const EligibilityPage({super.key});

  @override
  State<EligibilityPage> createState() => _EligibilityPageState();
}

class _EligibilityPageState extends State<EligibilityPage> {
  final _nikController = TextEditingController();
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _nikController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _onSubmit() {
    final nik = _nikController.text.trim();
    final name = _nameController.text.trim();

    if (nik.isEmpty || name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lengkapi NIK dan nama kamu dulu, ya.')),
      );
      return;
    }

    context.read<AuthBloc>().add(
      AuthEligibilitySubmitted(nik: nik, name: name),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: BlocConsumer<AuthBloc, AuthState>(
          listener: (context, state) {
            if (state.status == AuthStatus.authenticated) {
              Navigator.of(
                context,
              ).pushNamedAndRemoveUntil(AppRoutes.ktpIntro, (_) => false);
            }

            if (state.status == AuthStatus.unauthenticated &&
                state.errorMessage != null) {
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text(state.errorMessage!)));
            }
          },
          builder: (context, state) {
            final isLoading = state.status == AuthStatus.loading;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(Dimens.spacing24),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: Dimens.spacing32),
                      Container(
                        padding: const EdgeInsets.all(Dimens.spacing12),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(
                            Dimens.borderRadius16,
                          ),
                        ),
                        child: const Icon(
                          Icons.search,
                          size: 32,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: Dimens.spacing24),
                      const Text(
                        'Cek kelayakan kamu',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: Dimens.spacing8),
                      const Text(
                        'Masukkan NIK dan nama sesuai KTP untuk memastikan kamu terdaftar sebagai penerima bantuan.',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: Dimens.spacing24),
                      TextField(
                        controller: _nikController,
                        keyboardType: TextInputType.number,
                        maxLength: 16,
                        decoration: InputDecoration(
                          labelText: 'NIK',
                          hintText: 'Contoh: 3508xxxxxxxxxxxx',
                          counterText: '',
                          filled: true,
                          fillColor: AppColors.surface,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(
                              Dimens.borderRadius12,
                            ),
                            borderSide: BorderSide(
                              color: AppColors.textSecondary.withOpacity(0.2),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: Dimens.spacing16),
                      TextField(
                        controller: _nameController,
                        textCapitalization: TextCapitalization.words,
                        decoration: InputDecoration(
                          labelText: 'Nama lengkap',
                          hintText: 'Sesuai KTP',
                          filled: true,
                          fillColor: AppColors.surface,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(
                              Dimens.borderRadius12,
                            ),
                            borderSide: BorderSide(
                              color: AppColors.textSecondary.withOpacity(0.2),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: Dimens.spacing24),
                      PrimaryButton(
                        label: 'Lanjut',
                        onPressed: isLoading ? null : _onSubmit,
                        isLoading: isLoading,
                      ),
                      const SizedBox(height: Dimens.spacing32),
                      const Text(
                        'Data ini hanya digunakan untuk memastikan kamu terdaftar di wilayah bantuan yang tepat.',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
