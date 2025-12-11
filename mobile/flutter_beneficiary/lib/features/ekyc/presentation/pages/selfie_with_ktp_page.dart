import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/widgets/primary_button.dart';
import '../bloc/face_matching/face_matching_bloc.dart';
import '../bloc/face_matching/face_matching_event.dart';
import '../bloc/face_matching/face_matching_state.dart';
import '../widgets/camera_preview_widget.dart';

class SelfieWithKtpPage extends StatefulWidget {
  const SelfieWithKtpPage({super.key});

  @override
  State<SelfieWithKtpPage> createState() => _SelfieWithKtpPageState();
}

class _SelfieWithKtpPageState extends State<SelfieWithKtpPage> {
  @override
  void initState() {
    super.initState();
    context.read<FaceMatchingBloc>().add(const FaceMatchingStarted());
  }

  void _goNext() {
    Navigator.of(context).pushReplacementNamed(AppRoutes.livenessIntro);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Selfie dengan KTP')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Dimens.spacing16),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: IntrinsicHeight(
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 520),
                        child: BlocBuilder<FaceMatchingBloc, FaceMatchingState>(
                          builder: (context, state) {
                            final isUploading = state is FaceMatchingUploading;
                            final isUploaded = state is FaceMatchingUploaded;

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const CameraPreviewWidget(
                                  label: 'Arahkan wajah dan KTP ke kamera',
                                ),
                                const SizedBox(height: Dimens.spacing16),
                                if (isUploaded)
                                  Container(
                                    padding: const EdgeInsets.all(
                                      Dimens.spacing12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.secondary.withOpacity(
                                        0.1,
                                      ),
                                      borderRadius: BorderRadius.circular(
                                        Dimens.borderRadius12,
                                      ),
                                    ),
                                    child: const Text(
                                      'Foto wajah kamu sedang dicek. Kamu bisa lanjut ke langkah berikutnya.',
                                      style: TextStyle(
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                const SizedBox(height: Dimens.spacing24),
                                if (!isUploaded)
                                  PrimaryButton(
                                    label: isUploading
                                        ? 'Mengunggah...'
                                        : 'Ambil selfie',
                                    isLoading: isUploading,
                                    onPressed: isUploading
                                        ? null
                                        : () {
                                            context.read<FaceMatchingBloc>().add(
                                              const FaceMatchingTakeSelfie(),
                                            );
                                          },
                                  )
                                else
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      PrimaryButton(
                                        label: 'Lanjut ke cek gerakan',
                                        onPressed: _goNext,
                                      ),
                                      const SizedBox(height: Dimens.spacing12),
                                      OutlinedButton(
                                        onPressed: () {
                                          context.read<FaceMatchingBloc>().add(
                                            const FaceMatchingStarted(),
                                          );
                                        },
                                        child: const Text('Ambil ulang'),
                                      ),
                                    ],
                                  ),
                                const SizedBox(height: Dimens.spacing24),
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
